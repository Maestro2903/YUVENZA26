import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { verifyPaymentSignature, verifyWebhookSignature } from "@/lib/razorpay/verify";

const KEY_SECRET = "test_key_secret_123";

function signCheckout(orderId: string, paymentId: string, secret = KEY_SECRET): string {
  return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

describe("verifyPaymentSignature", () => {
  const orderId = "order_ABC123";
  const paymentId = "pay_XYZ789";

  it("accepts a valid signature", () => {
    expect(
      verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        signature: signCheckout(orderId, paymentId),
        keySecret: KEY_SECRET,
      })
    ).toBe(true);
  });

  it("accepts uppercase hex signatures", () => {
    expect(
      verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        signature: signCheckout(orderId, paymentId).toUpperCase(),
        keySecret: KEY_SECRET,
      })
    ).toBe(true);
  });

  it("rejects a signature for a different order", () => {
    expect(
      verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        signature: signCheckout("order_OTHER", paymentId),
        keySecret: KEY_SECRET,
      })
    ).toBe(false);
  });

  it("rejects a signature made with the wrong secret", () => {
    expect(
      verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        signature: signCheckout(orderId, paymentId, "attacker-secret"),
        keySecret: KEY_SECRET,
      })
    ).toBe(false);
  });

  it("rejects empty / malformed inputs", () => {
    expect(
      verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        signature: "",
        keySecret: KEY_SECRET,
      })
    ).toBe(false);
    expect(
      verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        signature: "not-hex-at-all!",
        keySecret: KEY_SECRET,
      })
    ).toBe(false);
    expect(
      verifyPaymentSignature({
        razorpayOrderId: "",
        razorpayPaymentId: paymentId,
        signature: signCheckout(orderId, paymentId),
        keySecret: KEY_SECRET,
      })
    ).toBe(false);
    // truncated signature must not pass (length check + timing-safe compare)
    expect(
      verifyPaymentSignature({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        signature: signCheckout(orderId, paymentId).slice(0, 32),
        keySecret: KEY_SECRET,
      })
    ).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ event: "payment.captured", payload: {} });

  it("accepts a valid webhook signature", () => {
    const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyWebhookSignature({ rawBody: body, signature, webhookSecret: secret })).toBe(true);
  });

  it("rejects a modified body", () => {
    const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(
      verifyWebhookSignature({ rawBody: body + " ", signature, webhookSecret: secret })
    ).toBe(false);
  });

  it("rejects the wrong secret and missing inputs", () => {
    const signature = crypto.createHmac("sha256", "other").update(body).digest("hex");
    expect(verifyWebhookSignature({ rawBody: body, signature, webhookSecret: secret })).toBe(false);
    expect(verifyWebhookSignature({ rawBody: body, signature: "", webhookSecret: secret })).toBe(false);
    expect(verifyWebhookSignature({ rawBody: "", signature, webhookSecret: secret })).toBe(false);
  });
});
