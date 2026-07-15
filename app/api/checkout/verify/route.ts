import { NextResponse } from "next/server";
import { verifyPaymentSignature } from "@/lib/razorpay/verify";
import { getRazorpayConfig } from "@/lib/razorpay/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/verify
 * Called by the client after Razorpay Checkout succeeds. Verifies the payment
 * signature server-side (HMAC-SHA256 with the key secret) and marks the order
 * paid. Idempotent: verifying an already-paid order returns success without
 * duplicating anything - the webhook and this route can race safely.
 */
export async function POST(req: Request) {
  if (!rateLimit(`verify:${clientIp(req)}`, 20, 60_000)) return tooManyRequests();

  let body: {
    orderId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    signature?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { orderId, razorpayOrderId, razorpayPaymentId, signature } = body;
  if (!orderId || !razorpayOrderId || !razorpayPaymentId || !signature) {
    return NextResponse.json({ ok: false, error: "Missing payment details." }, { status: 400 });
  }

  const service = getServiceSupabase();
  if (!service) {
    return NextResponse.json({ ok: false, error: "Payments are not configured." }, { status: 503 });
  }

  const { data: order, error: orderError } = await service
    .from("orders")
    .select("id, razorpay_order_id, status, amount")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order || order.razorpay_order_id !== razorpayOrderId) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  // Duplicate confirmation (e.g. webhook already processed it): succeed quietly.
  if (order.status === "paid") {
    return NextResponse.json({ ok: true, status: "paid", duplicate: true });
  }

  const config = await getRazorpayConfig();
  if (!config) {
    return NextResponse.json({ ok: false, error: "Payments are not configured." }, { status: 503 });
  }

  const valid = verifyPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    signature,
    keySecret: config.keySecret,
  });

  if (!valid) {
    console.warn(`[checkout] Signature verification FAILED for order ${orderId}`);
    return NextResponse.json(
      { ok: false, error: "Payment verification failed. If you were charged, contact us with your payment id." },
      { status: 400 }
    );
  }

  try {
    const { error: updateError } = await service
      .from("orders")
      .update({ status: "paid" })
      .eq("id", order.id);
    if (updateError) throw updateError;

    const { error: paymentError } = await service.from("payments").upsert(
      {
        order_id: order.id,
        razorpay_payment_id: razorpayPaymentId,
        status: "captured",
        amount: order.amount,
        raw: { source: "client-verify", signatureVerified: true },
      },
      { onConflict: "razorpay_payment_id" }
    );
    if (paymentError) throw paymentError;

    return NextResponse.json({ ok: true, status: "paid" });
  } catch (err) {
    console.error("[checkout] Failed to record verified payment:", err);
    // The signature was valid - tell the user we received it even though our
    // bookkeeping hiccuped; the webhook will reconcile the record.
    return NextResponse.json({ ok: true, status: "paid", recorded: false });
  }
}
