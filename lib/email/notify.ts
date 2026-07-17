import "server-only";

/**
 * Registration-confirmation email dispatch.
 *
 * Called from every path that marks an order paid (client verify, webhook,
 * free/demo checkout). Idempotent by construction: the sender atomically
 * claims orders.confirmation_email_sent_at first, so racing callers send at
 * most one email; if the send fails the claim is released so a later caller
 * (e.g. the webhook retry) can try again. Email failures never affect the
 * payment flow - they are logged and swallowed.
 *
 * The actual SMTP work happens in a Google Cloud Function
 * (google-cloud/email-function) reached over HTTPS with a shared secret.
 */
import { getAppEncryptionKey, getEmailFunctionConfig, getSiteUrl } from "@/lib/env";
import { getServiceSupabase } from "@/lib/supabase/server";
import { buildTicketPayload, deriveTicketKey } from "@/lib/ticket";
import { getEvents } from "@/lib/content/queries";

const SEND_TIMEOUT_MS = 8000;

/**
 * @returns true when an email was actually handed to the mail function;
 * false when skipped (unconfigured / already sent / not paid) or failed.
 */
export async function sendConfirmationEmail(orderId: string): Promise<boolean> {
  try {
    const config = getEmailFunctionConfig();
    const service = getServiceSupabase();
    const appKey = getAppEncryptionKey();
    if (!config || !service || !appKey) return false; // not configured - skip quietly

    // Atomic claim: exactly one caller proceeds even if verify + webhook race.
    const { data: claimed } = await service
      .from("orders")
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("status", "paid")
      .is("confirmation_email_sent_at", null)
      .select("id, customer_name, customer_email, amount, demo, event_slugs")
      .maybeSingle();
    if (!claimed) return false; // already sent, being sent, or not paid

    const catalog = await getEvents();
    const events = claimed.event_slugs.map((slug) => {
      const e = catalog.find((c) => c.slug === slug);
      return {
        title: e?.title ?? slug,
        dateLabel: e?.dateLabel ?? "",
        startTime: e?.startTime ?? null,
        endTime: e?.endTime ?? null,
        venue: e?.venue ?? null,
      };
    });

    const res = await fetch(config.url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-email-secret": config.secret },
      body: JSON.stringify({
        to: claimed.customer_email,
        name: claimed.customer_name,
        orderId: claimed.id,
        amountPaise: claimed.amount,
        demo: claimed.demo,
        events,
        qrPayload: buildTicketPayload(claimed.id, deriveTicketKey(appKey)),
        siteUrl: getSiteUrl(),
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new Error(`email function responded ${res.status}`);
    }
    return true;
  } catch (err) {
    console.error(`[email] confirmation for order ${orderId} failed:`, err);
    // Release the claim so a later caller (webhook retry) can resend.
    try {
      const service = getServiceSupabase();
      await service
        ?.from("orders")
        .update({ confirmation_email_sent_at: null })
        .eq("id", orderId);
    } catch {
      // best effort
    }
    return false;
  }
}
