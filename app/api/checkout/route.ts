import { NextResponse } from "next/server";
import { validateCheckout } from "@/lib/checkout";
import { getEventRegistrations, getEvents, getRegistrationSettings } from "@/lib/content/queries";
import { findSoldOut } from "@/lib/events/capacity";
import { createRazorpayOrder, getRazorpayConfig } from "@/lib/razorpay/server";
import {
  getAnonServerSupabase,
  getServerSupabase,
  getServiceSupabase,
} from "@/lib/supabase/server";
import { isAllowedEmail, normalizeDomain } from "@/lib/auth/allowedDomain";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { sendConfirmationEmail } from "@/lib/email/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/checkout
 * Creates a registration order. The total is recomputed server-side from the
 * event catalog - client-sent amounts are never trusted.
 *
 * Responses:
 *  - { mode: "razorpay", orderId, razorpayOrderId, keyId, amount, currency }
 *      -> the client opens Razorpay Checkout and then calls /api/checkout/verify
 *  - { mode: "free",  orderId }  -> free entries, registration recorded
 *  - { mode: "demo",  orderId }  -> no gateway configured, demo registration
 */
export async function POST(req: Request) {
  if (!rateLimit(`checkout:${clientIp(req)}`, 10, 60_000)) return tooManyRequests();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const catalog = await getEvents();
  const parsed = validateCheckout(body, catalog);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  const checkout = parsed.value;

  // ---- Capacity: reject sold-out events (live counters, same rule as UI) ----
  const counts = await getEventRegistrations();
  const soldOut = findSoldOut(checkout.events, counts);
  if (soldOut) {
    return NextResponse.json(
      { ok: false, error: `"${soldOut.title}" is sold out - remove it to continue.` },
      { status: 409 }
    );
  }

  // ---- Visitor authentication (Google sign-in) ----
  // getUser() validates against the auth server - correct for a mutation.
  // The verified account email overrides whatever the form submitted, and the
  // order is linked to the user so they can see their tickets.
  const registration = await getRegistrationSettings();

  // Published deadline is enforced here, not by someone staying up to flip a
  // toggle at midnight.
  if (registration.closesAt) {
    const closes = new Date(registration.closesAt).getTime();
    if (!Number.isNaN(closes) && Date.now() > closes) {
      return NextResponse.json(
        { ok: false, error: "Registration has closed. See you at the fest!" },
        { status: 403 }
      );
    }
  }

  let userId: string | null = null;
  if (registration.requireLogin) {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Please sign in with Google to register." },
        { status: 401 }
      );
    }
    const provider = (user.app_metadata?.provider as string | undefined) ?? "";
    if (provider === "google" && !isAllowedEmail(user.email, registration.allowedEmailDomain)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Only @${normalizeDomain(registration.allowedEmailDomain)} Google accounts can register.`,
        },
        { status: 403 }
      );
    }
    userId = user.id;
    if (user.email) checkout.email = user.email.toLowerCase();
  }

  // Respect the admin "payments enabled" switch (defaults to enabled).
  const anon = getAnonServerSupabase();
  if (anon) {
    const { data } = await anon
      .from("site_settings")
      .select("value")
      .eq("key", "payments")
      .maybeSingle();
    const value = data?.value as { enabled?: boolean } | null;
    if (value && value.enabled === false) {
      return NextResponse.json(
        { ok: false, error: "Registration is temporarily closed. Please check back soon." },
        { status: 503 }
      );
    }
  }

  const service = getServiceSupabase();

  // ---- One pass per person per event ----
  // The UI greys out events you already hold a pass for; re-checked here so
  // a stale tab or crafted request can't buy a duplicate.
  if (service) {
    let prior = service
      .from("orders")
      .select("event_slugs")
      .eq("status", "paid")
      .overlaps(
        "event_slugs",
        checkout.events.map((e) => e.slug)
      );
    prior = userId ? prior.eq("user_id", userId) : prior.eq("customer_email", checkout.email);
    const { data: priorOrders, error: priorError } = await prior.limit(100);
    if (!priorError && priorOrders) {
      const ownedSlugs = new Set(priorOrders.flatMap((o) => o.event_slugs as string[]));
      const dup = checkout.events.find((e) => ownedSlugs.has(e.slug));
      if (dup) {
        return NextResponse.json(
          {
            ok: false,
            error: `You already have a pass for "${dup.title}" - find it on your profile.`,
          },
          { status: 409 }
        );
      }
    }
  }

  const orderBase = {
    amount: checkout.totalPaise,
    currency: "INR",
    customer_name: checkout.name,
    customer_email: checkout.email,
    customer_phone: checkout.phone,
    customer_college: checkout.college,
    event_slugs: checkout.events.map((e) => e.slug),
    user_id: userId,
  };

  try {
    // Free registration: no gateway involved, recorded as paid.
    if (checkout.totalPaise === 0) {
      if (!service) return NextResponse.json({ ok: true, mode: "demo", orderId: "demo" });
      const { data, error } = await service
        .from("orders")
        .insert({ ...orderBase, status: "paid", demo: false })
        .select("id")
        .single();
      if (error) throw error;
      await sendConfirmationEmail(data.id); // idempotent, never throws
      return NextResponse.json({ ok: true, mode: "free", orderId: data.id });
    }

    const config = await getRazorpayConfig();

    // No gateway configured (local dev / pre-launch): demo registration.
    if (!config || !service) {
      if (!service) return NextResponse.json({ ok: true, mode: "demo", orderId: "demo" });
      const { data, error } = await service
        .from("orders")
        .insert({ ...orderBase, status: "paid", demo: true, notes: { mode: "demo" } })
        .select("id")
        .single();
      if (error) throw error;
      await sendConfirmationEmail(data.id); // idempotent, never throws
      return NextResponse.json({ ok: true, mode: "demo", orderId: data.id });
    }

    // Live flow: create the DB order first, then the Razorpay order.
    const { data: order, error: insertError } = await service
      .from("orders")
      .insert({ ...orderBase, status: "created", demo: false })
      .select("id")
      .single();
    if (insertError) throw insertError;

    const rzpOrder = await createRazorpayOrder(config, {
      amountPaise: checkout.totalPaise,
      receipt: order.id,
      notes: { email: checkout.email, phone: checkout.phone },
    });

    const { error: updateError } = await service
      .from("orders")
      .update({ razorpay_order_id: rzpOrder.id })
      .eq("id", order.id);
    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      mode: "razorpay",
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      keyId: config.keyId,
      amount: checkout.totalPaise,
      currency: "INR",
    });
  } catch (err) {
    console.error("[checkout] Order creation failed:", err);
    return NextResponse.json(
      { ok: false, error: "Could not start the registration. Please try again." },
      { status: 500 }
    );
  }
}
