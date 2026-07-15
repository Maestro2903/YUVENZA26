/**
 * Pure checkout logic - separated from the API routes so the money-handling
 * math and input validation are unit-testable. The server always recomputes
 * the total from the event catalog; client-sent amounts are never trusted.
 */
import type { EventItem } from "@/lib/content/types";

export type CheckoutInput = {
  name: string;
  email: string;
  phone: string;
  college?: string;
  eventSlugs: string[];
};

export type ValidatedCheckout = {
  name: string;
  email: string;
  phone: string;
  college: string | null;
  events: EventItem[];
  /** Total in rupees. */
  totalRupees: number;
  /** Total in paise (Razorpay's unit). */
  totalPaise: number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9]{10}$/;

export function validateCheckout(
  input: unknown,
  catalog: EventItem[]
): { ok: true; value: ValidatedCheckout } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid request body." };
  const body = input as Record<string, unknown>;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.replace(/[\s-]/g, "") : "";
  const college = typeof body.college === "string" ? body.college.trim() : "";
  const eventSlugs = Array.isArray(body.eventSlugs)
    ? body.eventSlugs.filter((s): s is string => typeof s === "string")
    : [];

  if (name.length < 2 || name.length > 120) {
    return { ok: false, error: "Please enter your full name." };
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (!PHONE_RE.test(phone)) {
    return { ok: false, error: "Please enter a valid 10-digit phone number." };
  }
  if (college.length > 200) {
    return { ok: false, error: "College name is too long." };
  }
  if (eventSlugs.length === 0) {
    return { ok: false, error: "Select at least one event." };
  }

  const unique = [...new Set(eventSlugs)];
  const bySlug = new Map(catalog.map((e) => [e.slug, e]));
  const events: EventItem[] = [];
  for (const slug of unique) {
    const event = bySlug.get(slug);
    if (!event) return { ok: false, error: "One of the selected events is no longer available." };
    events.push(event);
  }

  const totalRupees = events.reduce((sum, e) => sum + e.price, 0);
  return {
    ok: true,
    value: {
      name,
      email,
      phone,
      college: college || null,
      events,
      totalRupees,
      totalPaise: totalRupees * 100,
    },
  };
}
