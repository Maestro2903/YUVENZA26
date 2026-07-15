/**
 * Razorpay signature verification. Pure functions (no env, no I/O) so the
 * payment-critical path is unit-testable.
 *
 * Checkout signature: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
 * Webhook signature:  HMAC-SHA256(raw_request_body, webhook_secret)
 * Comparisons are constant-time.
 */
import crypto from "node:crypto";

function safeEqualHex(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");
  if (expected.length === 0 || expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

/** Verify the signature returned by Razorpay Checkout after a payment. */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const { razorpayOrderId, razorpayPaymentId, signature, keySecret } = params;
  if (!razorpayOrderId || !razorpayPaymentId || !signature || !keySecret) return false;
  if (!/^[0-9a-f]+$/i.test(signature)) return false;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  return safeEqualHex(expected, signature.toLowerCase());
}

/** Verify the X-Razorpay-Signature header of a webhook request. */
export function verifyWebhookSignature(params: {
  rawBody: string;
  signature: string;
  webhookSecret: string;
}): boolean {
  const { rawBody, signature, webhookSecret } = params;
  if (!rawBody || !signature || !webhookSecret) return false;
  if (!/^[0-9a-f]+$/i.test(signature)) return false;
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature.toLowerCase());
}
