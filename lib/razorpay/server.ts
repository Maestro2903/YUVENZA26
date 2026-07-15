import "server-only";

/**
 * Server-side Razorpay integration: credential resolution and order creation.
 *
 * Credentials are resolved in priority order:
 *   1. app_secrets table (set via the admin panel, AES-256-GCM encrypted,
 *      readable only with the service role + APP_ENCRYPTION_KEY)
 *   2. RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET environment variables
 * The key secret never leaves the server. The key id is sent to the browser
 * only at checkout time (Razorpay's checkout.js requires it).
 */
import { getRazorpayEnvConfig, getRazorpayWebhookSecretEnv } from "@/lib/env";
import { decryptWithAppKey, isEncryptionConfigured } from "@/lib/security/crypto";
import { getServiceSupabase } from "@/lib/supabase/server";

export const SECRET_KEYS = {
  keyId: "razorpay_key_id",
  keySecret: "razorpay_key_secret",
  webhookSecret: "razorpay_webhook_secret",
} as const;

export type RazorpayConfig = { keyId: string; keySecret: string };

async function readStoredSecrets(keys: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!isEncryptionConfigured()) return out;
  const supabase = getServiceSupabase();
  if (!supabase) return out;
  const { data, error } = await supabase.from("app_secrets").select("key, value").in("key", keys);
  if (error || !data) return out;
  for (const row of data) {
    try {
      out[row.key] = decryptWithAppKey(row.value);
    } catch (err) {
      console.error(`[razorpay] Failed to decrypt secret "${row.key}":`, err);
    }
  }
  return out;
}

/** Resolve Razorpay credentials (admin-panel first, env fallback). */
export async function getRazorpayConfig(): Promise<RazorpayConfig | null> {
  const stored = await readStoredSecrets([SECRET_KEYS.keyId, SECRET_KEYS.keySecret]);
  const env = getRazorpayEnvConfig();
  const keyId = stored[SECRET_KEYS.keyId] || env.keyId;
  const keySecret = stored[SECRET_KEYS.keySecret] || env.keySecret;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export async function getRazorpayWebhookSecret(): Promise<string | null> {
  const stored = await readStoredSecrets([SECRET_KEYS.webhookSecret]);
  return stored[SECRET_KEYS.webhookSecret] || getRazorpayWebhookSecretEnv();
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string | null;
  status: string;
};

/**
 * Create an order via the Razorpay Orders API.
 * Amount is in paise. Payments are auto-captured.
 */
export async function createRazorpayOrder(
  config: RazorpayConfig,
  params: { amountPaise: number; receipt: string; notes?: Record<string, string> }
): Promise<RazorpayOrder> {
  const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: "INR",
      receipt: params.receipt,
      payment_capture: 1,
      notes: params.notes ?? {},
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[razorpay] Order creation failed (${res.status}): ${detail}`);
    throw new Error("Payment gateway rejected the order. Please try again.");
  }
  return (await res.json()) as RazorpayOrder;
}
