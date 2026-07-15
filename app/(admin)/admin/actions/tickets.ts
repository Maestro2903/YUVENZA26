"use server";

/**
 * Entry-pass verification + gate check-in (Admin -> Orders & payments).
 *
 * A scanned QR payload is validated cryptographically (HMAC signature) and
 * looked up - the pass only ever proves "this exact paid order"; all details
 * come from the database. The FIRST valid scan atomically marks the order
 * checked-in; any later scan of the same pass warns staff it was already
 * used, so one ticket can't admit two people.
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
  /** True when the pass is genuine but was scanned before. */
  alreadyCheckedIn?: boolean;
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
    checkedInAt: string | null;
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
        "id, status, demo, amount, customer_name, customer_email, customer_phone, customer_college, event_slugs, created_at, checked_in_at"
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

    // Atomic first-scan check-in: the conditional update succeeds for exactly
    // one scan even if two gates read the same pass simultaneously.
    let checkedInAt = order.checked_in_at;
    let alreadyCheckedIn = false;
    if (checkedInAt) {
      alreadyCheckedIn = true;
    } else {
      const { data: claimed } = await service
        .from("orders")
        .update({ checked_in_at: new Date().toISOString() })
        .eq("id", order.id)
        .is("checked_in_at", null)
        .select("checked_in_at")
        .maybeSingle();
      if (claimed?.checked_in_at) {
        checkedInAt = claimed.checked_in_at;
      } else {
        // Lost the race - someone else scanned it a moment ago.
        alreadyCheckedIn = true;
        const { data: fresh } = await service
          .from("orders")
          .select("checked_in_at")
          .eq("id", order.id)
          .maybeSingle();
        checkedInAt = fresh?.checked_in_at ?? null;
      }
    }

    const catalog = await getEvents();
    const events = order.event_slugs.map(
      (slug) => catalog.find((e) => e.slug === slug)?.title ?? slug
    );

    const when = checkedInAt ? new Date(checkedInAt).toLocaleTimeString("en-IN") : "";
    return {
      checked: true,
      valid: true,
      alreadyCheckedIn,
      message: alreadyCheckedIn
        ? `VALID PASS but ALREADY CHECKED IN at ${when} - possible re-use, verify identity.`
        : `Valid pass - checked in ✓${order.demo ? " (demo order, no real payment)" : ""}`,
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
        checkedInAt,
      },
    };
  } catch (err) {
    return { checked: true, valid: false, message: errorMessage(err) };
  }
}
