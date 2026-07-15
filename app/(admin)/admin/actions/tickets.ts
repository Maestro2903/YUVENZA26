"use server";

/**
 * Entry-pass verification for check-in staff (Admin -> Orders & payments).
 * A scanned QR payload is validated cryptographically (HMAC signature) and
 * then looked up - the pass only ever proves "this exact paid order", all
 * displayed details come from the database.
 */
import { requirePermission } from "@/lib/rbac/guards";
import { getServiceSupabase } from "@/lib/supabase/server";
import { getAppEncryptionKey } from "@/lib/env";
import { deriveTicketKey, verifyTicketPayload } from "@/lib/ticket";
import { getEvents } from "@/lib/content/queries";
import { errorMessage } from "./helpers";

export type VerifyTicketState = {
  checked: boolean;
  valid: boolean;
  message: string;
  order?: {
    name: string;
    email: string;
    phone: string;
    college: string | null;
    events: string[];
    amountRupees: number;
    status: string;
    demo: boolean;
    createdAt: string;
  };
};

export async function verifyTicketAction(
  _prev: VerifyTicketState,
  formData: FormData
): Promise<VerifyTicketState> {
  try {
    await requirePermission("payments.view");

    const payload = String(formData.get("payload") ?? "").trim();
    if (!payload) return { checked: false, valid: false, message: "" };
    if (payload.length > 200) {
      return { checked: true, valid: false, message: "That doesn't look like a Yuvenza pass." };
    }

    const appKey = getAppEncryptionKey();
    if (!appKey) {
      return {
        checked: true,
        valid: false,
        message: "APP_ENCRYPTION_KEY is not configured - passes can't be verified.",
      };
    }

    const verdict = verifyTicketPayload(payload, deriveTicketKey(appKey));
    if (!verdict.valid) {
      const message =
        verdict.reason === "signature"
          ? "INVALID PASS - the signature does not match. This QR was not issued by us."
          : "Not a recognisable Yuvenza pass.";
      return { checked: true, valid: false, message };
    }

    const service = getServiceSupabase();
    if (!service) {
      return { checked: true, valid: false, message: "Database is not configured." };
    }
    const { data: order } = await service
      .from("orders")
      .select(
        "id, status, demo, amount, customer_name, customer_email, customer_phone, customer_college, event_slugs, created_at"
      )
      .eq("id", verdict.orderId)
      .maybeSingle();

    if (!order) {
      return { checked: true, valid: false, message: "Signature OK but no such order exists." };
    }
    if (order.status !== "paid") {
      return {
        checked: true,
        valid: false,
        message: `Order found but NOT paid (status: ${order.status}). Do not admit.`,
      };
    }

    const catalog = await getEvents();
    const events = order.event_slugs.map(
      (slug) => catalog.find((e) => e.slug === slug)?.title ?? slug
    );

    return {
      checked: true,
      valid: true,
      message: order.demo ? "Valid pass (demo order - no real payment)." : "Valid pass - paid.",
      order: {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
        college: order.customer_college,
        events,
        amountRupees: Math.round(order.amount / 100),
        status: order.status,
        demo: order.demo,
        createdAt: order.created_at,
      },
    };
  } catch (err) {
    return { checked: true, valid: false, message: errorMessage(err) };
  }
}
