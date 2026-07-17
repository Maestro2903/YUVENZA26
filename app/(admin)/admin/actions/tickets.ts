"use server";

/**
 * Entry-pass verification + gate check-in.
 *
 * Check-in is PER EVENT (order_checkins, unique per order+event): a student
 * with one order covering two events scans cleanly at both gates, while a
 * second scan at the SAME event raises the re-use warning. Every scan
 * records who scanned it. Gate staff only need the checkin.verify permission
 * (no revenue/PII exports); payments.view keeps working for back-compat.
 *
 * A pass is validated cryptographically (HMAC signature) before any lookup -
 * all displayed details come from the database, never from the QR.
 */
import {
  AuthorizationError,
  getAdminIdentity,
  identityHasPermission,
  type AdminIdentity,
} from "@/lib/rbac/guards";
import { getServiceSupabase } from "@/lib/supabase/server";
import { getAppEncryptionKey } from "@/lib/env";
import { deriveTicketKey, verifyTicketPayload } from "@/lib/ticket";
import { getEvents } from "@/lib/content/queries";
import { errorMessage } from "./helpers";

const SLUG_RE = /^[a-z0-9-]{1,100}$/;

async function requireGateAccess(): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) throw new AuthorizationError("Not signed in", 401);
  if (
    !identityHasPermission(identity, "checkin.verify") &&
    !identityHasPermission(identity, "payments.view")
  ) {
    throw new AuthorizationError("Missing permission: checkin.verify", 403);
  }
  return identity;
}

export type VerifyTicketState = {
  checked: boolean;
  valid: boolean;
  /** True when the pass is genuine but was already scanned (this event / this order). */
  alreadyCheckedIn?: boolean;
  message: string;
  /** Context for the undo button. */
  orderId?: string;
  gateEvent?: string;
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
    /** Per-event scans already recorded for this order. */
    checkins: { eventSlug: string; eventTitle: string; scannedAt: string }[];
  };
};

export async function verifyTicketAction(
  _prev: VerifyTicketState,
  formData: FormData
): Promise<VerifyTicketState> {
  try {
    const identity = await requireGateAccess();

    const payload = String(formData.get("payload") ?? "").trim();
    const gateEventRaw = String(formData.get("gate_event") ?? "").trim();
    const gateEvent = SLUG_RE.test(gateEventRaw) ? gateEventRaw : "";
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

    const catalog = await getEvents();
    const titleFor = (slug: string) => catalog.find((e) => e.slug === slug)?.title ?? slug;

    // Gate context: the pass must actually include this gate's event.
    if (gateEvent && !order.event_slugs.includes(gateEvent)) {
      return {
        checked: true,
        valid: false,
        orderId: order.id,
        gateEvent,
        message: `Valid pass, but ${order.customer_name} is NOT registered for ${titleFor(gateEvent)}. Registered: ${order.event_slugs.map(titleFor).join(", ")}.`,
      };
    }

    // Record the check-in.
    let alreadyCheckedIn = false;
    let alreadyAt: string | null = null;

    if (gateEvent) {
      // Per-event claim: the unique (order_id, event_slug) constraint makes
      // the first scan win even across simultaneous gates.
      const { error: insertError } = await service.from("order_checkins").insert({
        order_id: order.id,
        event_slug: gateEvent,
        scanned_by: identity.userId,
      });
      if (insertError) {
        if (insertError.code === "23505") {
          alreadyCheckedIn = true;
          const { data: existing } = await service
            .from("order_checkins")
            .select("scanned_at")
            .eq("order_id", order.id)
            .eq("event_slug", gateEvent)
            .maybeSingle();
          alreadyAt = existing?.scanned_at ?? null;
        } else {
          throw insertError;
        }
      }
    } else {
      // General gate (no event context): order-level first-scan claim.
      if (order.checked_in_at) {
        alreadyCheckedIn = true;
        alreadyAt = order.checked_in_at;
      } else {
        const { data: claimed } = await service
          .from("orders")
          .update({ checked_in_at: new Date().toISOString() })
          .eq("id", order.id)
          .is("checked_in_at", null)
          .select("checked_in_at")
          .maybeSingle();
        if (!claimed?.checked_in_at) {
          alreadyCheckedIn = true;
          const { data: fresh } = await service
            .from("orders")
            .select("checked_in_at")
            .eq("id", order.id)
            .maybeSingle();
          alreadyAt = fresh?.checked_in_at ?? null;
        }
      }
    }

    // Keep the order-level "first scan anywhere" stamp for the list pill.
    if (!alreadyCheckedIn && gateEvent && !order.checked_in_at) {
      await service
        .from("orders")
        .update({ checked_in_at: new Date().toISOString() })
        .eq("id", order.id)
        .is("checked_in_at", null);
    }

    const { data: checkinRows } = await service
      .from("order_checkins")
      .select("event_slug, scanned_at")
      .eq("order_id", order.id)
      .order("scanned_at", { ascending: true });

    const scope = gateEvent ? titleFor(gateEvent) : "this order";
    const when = alreadyAt ? new Date(alreadyAt).toLocaleTimeString("en-IN") : "";
    return {
      checked: true,
      valid: true,
      alreadyCheckedIn,
      orderId: order.id,
      gateEvent: gateEvent || undefined,
      message: alreadyCheckedIn
        ? `VALID PASS but ALREADY CHECKED IN for ${scope} at ${when} - possible re-use, verify identity.`
        : `Valid pass - checked in for ${scope} ✓${order.demo ? " (demo order, no real payment)" : ""}`,
      order: {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
        college: order.customer_college,
        events: order.event_slugs.map(titleFor),
        amountRupees: Math.round(order.amount / 100),
        status: order.status,
        demo: order.demo,
        createdAt: order.created_at,
        checkedInAt: order.checked_in_at,
        checkins: (checkinRows ?? []).map((c) => ({
          eventSlug: c.event_slug,
          eventTitle: titleFor(c.event_slug),
          scannedAt: c.scanned_at,
        })),
      },
    };
  } catch (err) {
    return { checked: true, valid: false, message: errorMessage(err) };
  }
}

export type UndoCheckinState = { done: boolean; message: string };

/**
 * Undo a mis-scan. With an event slug it removes that event's check-in;
 * without one it fully resets the order (all events + the order-level stamp).
 */
export async function undoCheckinAction(
  _prev: UndoCheckinState,
  formData: FormData
): Promise<UndoCheckinState> {
  try {
    await requireGateAccess();
    const orderId = String(formData.get("order_id") ?? "").trim();
    const gateEventRaw = String(formData.get("gate_event") ?? "").trim();
    const gateEvent = SLUG_RE.test(gateEventRaw) ? gateEventRaw : "";
    if (!orderId) return { done: false, message: "Missing order id." };

    const service = getServiceSupabase();
    if (!service) return { done: false, message: "Database is not configured." };

    if (gateEvent) {
      const { error } = await service
        .from("order_checkins")
        .delete()
        .eq("order_id", orderId)
        .eq("event_slug", gateEvent);
      if (error) throw error;
      // Clear the order-level stamp only when no per-event scans remain.
      const { count } = await service
        .from("order_checkins")
        .select("*", { count: "exact", head: true })
        .eq("order_id", orderId);
      if ((count ?? 0) === 0) {
        await service.from("orders").update({ checked_in_at: null }).eq("id", orderId);
      }
      return { done: true, message: "Check-in undone for this event." };
    }

    const { error: allError } = await service
      .from("order_checkins")
      .delete()
      .eq("order_id", orderId);
    if (allError) throw allError;
    const { error } = await service
      .from("orders")
      .update({ checked_in_at: null })
      .eq("id", orderId);
    if (error) throw error;
    return { done: true, message: "All check-ins reset for this order." };
  } catch (err) {
    return { done: false, message: errorMessage(err) };
  }
}
