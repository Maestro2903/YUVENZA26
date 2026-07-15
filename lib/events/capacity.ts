/**
 * Slot-availability logic. Pure and client-safe - the registration UI, the
 * public events page and the checkout API all apply the same rule.
 *
 * Note: the counter tracks PAID registrations, so two people paying for the
 * last slot at the same moment can both succeed (a small, standard oversell
 * window). Checkout rejects anything already at/over capacity.
 */
import type { EventItem } from "@/lib/content/types";

/** Remaining slots, or null when the event has no capacity limit. */
export function remainingSlots(
  event: Pick<EventItem, "capacity">,
  registered: number | undefined
): number | null {
  if (event.capacity === undefined || event.capacity === null) return null;
  return Math.max(0, event.capacity - Math.max(0, registered ?? 0));
}

export function isSoldOut(
  event: Pick<EventItem, "capacity">,
  registered: number | undefined
): boolean {
  const remaining = remainingSlots(event, registered);
  return remaining !== null && remaining <= 0;
}

/** First sold-out event in a selection (server-side checkout guard). */
export function findSoldOut(
  events: EventItem[],
  counts: Record<string, number>
): EventItem | null {
  for (const event of events) {
    if (isSoldOut(event, counts[event.slug])) return event;
  }
  return null;
}

/** Display label: "97 / 120 slots left", "Sold out · 0 / 120", or the free-text fallback. */
export function slotsLabel(
  event: Pick<EventItem, "capacity" | "slots">,
  registered: number | undefined
): string {
  const remaining = remainingSlots(event, registered);
  if (remaining === null || event.capacity == null) return event.slots ?? "";
  if (remaining <= 0) return `Sold out · 0 / ${event.capacity}`;
  return `${remaining} / ${event.capacity} slots left`;
}
