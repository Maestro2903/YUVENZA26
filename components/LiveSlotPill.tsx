"use client";

/**
 * Small live "remaining / total" pill for server-rendered pages (event detail
 * page). Shares the page-wide Realtime channel via useLiveSlots.
 */
import { slotsLabel } from "@/lib/events/capacity";
import { isSoldOut } from "@/lib/events/capacity";
import { useLiveSlots } from "@/lib/hooks/useLiveSlots";

export default function LiveSlotPill({
  slug,
  capacity,
  slots,
  initialRegistered,
}: {
  slug: string;
  capacity?: number;
  slots?: string;
  initialRegistered: number;
}) {
  const counts = useLiveSlots({ [slug]: initialRegistered });
  const registered = counts[slug] ?? initialRegistered;
  const label = slotsLabel({ capacity, slots }, registered);
  if (!label) return null;
  return (
    <span className={"evx-slots" + (isSoldOut({ capacity }, registered) ? " out" : "")} aria-live="polite">
      {label}
    </span>
  );
}
