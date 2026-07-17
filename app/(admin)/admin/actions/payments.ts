"use server";

/**
 * Payment-operations actions. Resending the confirmation email is gated on
 * payments.manage (super_admin by default; grant it to other roles in
 * Admin -> Roles & permissions if gate staff need it).
 */
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac/guards";
import { getServiceSupabase } from "@/lib/supabase/server";
import { sendConfirmationEmail } from "@/lib/email/notify";
import { getEmailFunctionConfig } from "@/lib/env";
import { getRazorpayConfig, refundRazorpayPayment } from "@/lib/razorpay/server";
import { getEvents } from "@/lib/content/queries";
import { validateCheckout } from "@/lib/checkout";
import type { Json } from "@/lib/supabase/types";
import { errorMessage, str, withFlash } from "./helpers";

/** Append an operator note to orders.notes (jsonb) without clobbering it. */
function appendNote(existing: Json | null, entry: Record<string, string | boolean>): Json {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing) ? { ...existing } : {};
  const log = Array.isArray((base as Record<string, Json>).log)
    ? ([...((base as Record<string, Json>).log as Json[])] as Json[])
    : [];
  log.push({ ...entry, at: new Date().toISOString() } as Json);
  return { ...base, log } as Json;
}

export async function resendConfirmationEmailAction(formData: FormData): Promise<void> {
  const back = str(formData, "back") || "/admin/payments";
  let dest: string;
  try {
    await requirePermission("payments.manage");
    const orderId = str(formData, "order_id");
    if (!orderId) throw new Error("Missing order id.");

    // Check sendability BEFORE touching the sent-marker: a resend attempt on
    // an unconfigured deployment must not erase the record that the original
    // email went out.
    if (!getEmailFunctionConfig()) {
      throw new Error(
        "Email service is not configured (EMAIL_FUNCTION_URL / EMAIL_FUNCTION_SECRET)."
      );
    }

    const service = getServiceSupabase();
    if (!service) throw new Error("Supabase is not configured.");

    const { data: order, error } = await service
      .from("orders")
      .select("id, status, customer_email")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) throw new Error("Order not found.");
    if (order.status !== "paid") throw new Error("Only paid orders get confirmation emails.");

    // Release any previous claim, then send (sendConfirmationEmail re-claims
    // atomically and never throws).
    const { error: clearError } = await service
      .from("orders")
      .update({ confirmation_email_sent_at: null })
      .eq("id", orderId);
    if (clearError) throw clearError;

    const sent = await sendConfirmationEmail(orderId);
    dest = withFlash(
      back,
      sent ? "ok" : "err",
      sent
        ? `Confirmation email resent to ${order.customer_email}.`
        : "Could not send - check EMAIL_FUNCTION_URL/SECRET configuration and the function logs."
    );
  } catch (err) {
    dest = withFlash(back, "err", errorMessage(err));
  }
  redirect(dest);
}

/**
 * Mark an order paid manually - the recovery path for cash payments at the
 * desk or a payment confirmed in the Razorpay dashboard whose webhook never
 * arrived. Only non-paid, non-cancelled orders qualify; the counter trigger
 * updates live slots and the confirmation email goes out.
 */
export async function markOrderPaidAction(formData: FormData): Promise<void> {
  const back = str(formData, "back") || "/admin/payments";
  let dest: string;
  try {
    const identity = await requirePermission("payments.manage");
    const orderId = str(formData, "order_id");
    const reason = str(formData, "reason") || "manual confirmation";
    if (!orderId) throw new Error("Missing order id.");

    const service = getServiceSupabase();
    if (!service) throw new Error("Supabase is not configured.");

    const { data: order, error: readError } = await service
      .from("orders")
      .select("id, status, notes, customer_email")
      .eq("id", orderId)
      .maybeSingle();
    if (readError) throw readError;
    if (!order) throw new Error("Order not found.");
    if (order.status === "paid") throw new Error("Order is already paid.");

    const { error } = await service
      .from("orders")
      .update({
        status: "paid",
        notes: appendNote(order.notes, {
          action: "mark-paid",
          by: identity.email,
          reason,
        }),
      })
      .eq("id", orderId)
      .neq("status", "paid");
    if (error) throw error;

    await sendConfirmationEmail(orderId); // idempotent, never throws
    dest = withFlash(back, "ok", `Order marked paid (${reason}). Confirmation email queued.`);
  } catch (err) {
    dest = withFlash(back, "err", errorMessage(err));
  }
  redirect(dest);
}

/**
 * Issue a complimentary (free) pass - judges, guests, sponsors, volunteers.
 * Creates a paid ₹0 order so the QR pass, email and check-in all work
 * exactly like a normal registration. Sold-out limits do NOT apply to comps
 * (capacity is a sales limit, not a door limit); time-clash rules still do.
 */
export async function createCompOrderAction(formData: FormData): Promise<void> {
  const back = "/admin/payments";
  let dest: string;
  try {
    const identity = await requirePermission("payments.manage");
    const service = getServiceSupabase();
    if (!service) throw new Error("Supabase is not configured.");

    const catalog = await getEvents();
    const eventSlugs = formData
      .getAll("event_slugs")
      .filter((v): v is string => typeof v === "string");
    const parsed = validateCheckout(
      {
        name: str(formData, "name"),
        email: str(formData, "email"),
        phone: str(formData, "phone"),
        college: str(formData, "college"),
        eventSlugs,
      },
      catalog
    );
    if (!parsed.ok) throw new Error(parsed.error);
    const c = parsed.value;

    const { data: order, error } = await service
      .from("orders")
      .insert({
        amount: 0,
        currency: "INR",
        status: "paid",
        demo: false,
        customer_name: c.name,
        customer_email: c.email,
        customer_phone: c.phone,
        customer_college: c.college,
        event_slugs: c.events.map((e) => e.slug),
        notes: appendNote(null, {
          action: "comp-pass",
          by: identity.email,
          note: str(formData, "note") || "complimentary",
        }),
      })
      .select("id")
      .single();
    if (error) throw error;

    await sendConfirmationEmail(order.id); // idempotent, never throws
    dest = withFlash(back, "ok", `Comp pass issued to ${c.email} - pass emailed.`);
  } catch (err) {
    dest = withFlash(back, "err", errorMessage(err));
  }
  redirect(dest);
}

/**
 * Full refund via the Razorpay API. On success the payment row becomes
 * "refunded" and the order "cancelled" - which releases the live slot
 * (counter trigger) and stops the QR pass from admitting.
 */
export async function refundOrderAction(formData: FormData): Promise<void> {
  const back = str(formData, "back") || "/admin/payments";
  let dest: string;
  try {
    const identity = await requirePermission("payments.manage");
    const orderId = str(formData, "order_id");
    const reason = str(formData, "reason") || "operator refund";
    if (!orderId) throw new Error("Missing order id.");

    const service = getServiceSupabase();
    if (!service) throw new Error("Supabase is not configured.");

    const { data: order, error: readError } = await service
      .from("orders")
      .select("id, status, demo, amount, notes, customer_email, payments ( id, razorpay_payment_id, status )")
      .eq("id", orderId)
      .maybeSingle();
    if (readError) throw readError;
    if (!order) throw new Error("Order not found.");
    if (order.status !== "paid") throw new Error("Only paid orders can be refunded.");

    const payments = Array.isArray(order.payments)
      ? order.payments
      : order.payments
        ? [order.payments]
        : [];
    const captured = payments.find(
      (p) => p.status === "captured" && p.razorpay_payment_id
    );

    if (order.demo || order.amount === 0 || !captured) {
      // Nothing was charged (demo/free/comp): just cancel locally.
      const { error } = await service
        .from("orders")
        .update({
          status: "cancelled",
          notes: appendNote(order.notes, { action: "cancel", by: identity.email, reason }),
        })
        .eq("id", orderId);
      if (error) throw error;
      dest = withFlash(back, "ok", "Order cancelled (no money was involved).");
    } else {
      const config = await getRazorpayConfig();
      if (!config) throw new Error("Razorpay is not configured.");

      const refund = await refundRazorpayPayment(config, {
        paymentId: captured.razorpay_payment_id!,
        notes: { orderId, by: identity.email, reason },
      });

      const { error: payError } = await service
        .from("payments")
        .update({ status: "refunded" })
        .eq("id", captured.id);
      if (payError) throw payError;

      const { error } = await service
        .from("orders")
        .update({
          status: "cancelled",
          notes: appendNote(order.notes, {
            action: "refund",
            by: identity.email,
            reason,
            refundId: refund.id,
          }),
        })
        .eq("id", orderId);
      if (error) throw error;

      dest = withFlash(
        back,
        "ok",
        `Refund ${refund.id} issued to ${order.customer_email}; order cancelled and slot released.`
      );
    }
  } catch (err) {
    dest = withFlash(back, "err", errorMessage(err));
  }
  redirect(dest);
}
