import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay/verify";
import { getRazorpayWebhookSecret } from "@/lib/razorpay/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import type { Json, PaymentStatus } from "@/lib/supabase/types";
import { sendConfirmationEmail } from "@/lib/email/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RazorpayPaymentEntity = {
  id: string;
  order_id: string;
  status: string;
  method?: string;
  amount?: number;
  error_description?: string | null;
};

/**
 * POST /api/webhooks/razorpay
 * Authoritative payment status updates from Razorpay. Configure the webhook in
 * the Razorpay dashboard pointing at <site>/api/webhooks/razorpay with events
 * payment.captured, payment.failed and order.paid, and set the same secret in
 * the admin panel (or RAZORPAY_WEBHOOK_SECRET). Idempotent - replayed events
 * upsert by razorpay_payment_id and never downgrade a paid order.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  const secret = await getRazorpayWebhookSecret();
  if (!secret) {
    console.error("[webhook] Received a Razorpay webhook but no webhook secret is configured.");
    return NextResponse.json({ ok: false, error: "Webhook not configured." }, { status: 503 });
  }

  if (!verifyWebhookSignature({ rawBody, signature, webhookSecret: secret })) {
    console.warn("[webhook] Invalid Razorpay webhook signature.");
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 401 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: RazorpayPaymentEntity } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const service = getServiceSupabase();
  if (!service) {
    return NextResponse.json({ ok: false, error: "Database not configured." }, { status: 503 });
  }

  const payment = event.payload?.payment?.entity;
  const eventName = event.event ?? "";

  try {
    if (!payment?.order_id) {
      // order.paid without a payment payload (or an event we don't track).
      return NextResponse.json({ ok: true, ignored: true });
    }

    const { data: order } = await service
      .from("orders")
      .select("id, status")
      .eq("razorpay_order_id", payment.order_id)
      .maybeSingle();
    if (!order) {
      console.warn(`[webhook] No local order for Razorpay order ${payment.order_id}`);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const paymentStatus: PaymentStatus =
      eventName === "payment.captured"
        ? "captured"
        : eventName === "payment.failed"
          ? "failed"
          : payment.status === "captured"
            ? "captured"
            : "pending";

    await service.from("payments").upsert(
      {
        order_id: order.id,
        razorpay_payment_id: payment.id,
        status: paymentStatus,
        method: payment.method ?? null,
        amount: payment.amount ?? null,
        error_reason: payment.error_description ?? null,
        raw: { source: "webhook", event: eventName, entity: payment } as unknown as Json,
      },
      { onConflict: "razorpay_payment_id" }
    );

    if (paymentStatus === "captured") {
      await service.from("orders").update({ status: "paid" }).eq("id", order.id);
      await sendConfirmationEmail(order.id); // idempotent, never throws
    } else if (paymentStatus === "failed" && order.status !== "paid") {
      await service.from("orders").update({ status: "failed" }).eq("id", order.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] Processing failed:", err);
    // Non-2xx so Razorpay retries the delivery.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
