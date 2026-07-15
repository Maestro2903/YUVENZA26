import { NextResponse } from "next/server";
import { getServerSupabase, getServiceSupabase } from "@/lib/supabase/server";
import { getAppEncryptionKey } from "@/lib/env";
import { buildTicketPayload, deriveTicketKey } from "@/lib/ticket";
import { getEvents } from "@/lib/content/queries";
import { getAdminIdentity, identityHasPermission } from "@/lib/rbac/guards";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/ticket/[orderId] - issue the signed QR entry-pass payload.
 *
 * Only the server can mint a valid pass: the payload carries an HMAC
 * signature (key derived from APP_ENCRYPTION_KEY) that check-in verification
 * requires. Issued exclusively for PAID orders, and only to the visitor who
 * owns the order (or an admin with payments.view).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  if (!rateLimit(`ticket:${clientIp(request)}`, 30, 60_000)) return tooManyRequests();

  const { orderId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    return NextResponse.json({ ok: false, error: "Invalid order id." }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const service = getServiceSupabase();
  if (!supabase || !service) {
    return NextResponse.json({ ok: false, error: "Not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in to view your pass." }, { status: 401 });
  }

  const { data: order } = await service
    .from("orders")
    .select(
      "id, status, demo, amount, customer_name, customer_email, customer_phone, customer_college, event_slugs, user_id, created_at"
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  // Owner, or an admin with payments.view.
  if (order.user_id !== user.id) {
    const identity = await getAdminIdentity();
    if (!identityHasPermission(identity, "payments.view")) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
    }
  }

  if (order.status !== "paid") {
    return NextResponse.json(
      { ok: false, error: "Your entry pass unlocks once the payment is confirmed." },
      { status: 403 }
    );
  }

  const appKey = getAppEncryptionKey();
  if (!appKey) {
    console.error("[ticket] APP_ENCRYPTION_KEY missing - cannot sign passes.");
    return NextResponse.json({ ok: false, error: "Passes are unavailable right now." }, { status: 503 });
  }

  let payload: string;
  try {
    payload = buildTicketPayload(order.id, deriveTicketKey(appKey));
  } catch (err) {
    console.error("[ticket] signing failed:", err);
    return NextResponse.json({ ok: false, error: "Passes are unavailable right now." }, { status: 503 });
  }

  const catalog = await getEvents();
  const events = order.event_slugs.map((slug) => {
    const e = catalog.find((c) => c.slug === slug);
    return {
      title: e?.title ?? slug,
      dateLabel: e?.dateLabel ?? "",
      startTime: e?.startTime ?? null,
      endTime: e?.endTime ?? null,
    };
  });

  // Full details are safe here: this endpoint only answers to the order's
  // owner or an admin (checked above).
  return NextResponse.json({
    ok: true,
    payload,
    orderId: order.id,
    name: order.customer_name,
    email: order.customer_email,
    phone: order.customer_phone,
    college: order.customer_college,
    amountPaise: order.amount,
    createdAt: order.created_at,
    events,
    demo: order.demo,
  });
}
