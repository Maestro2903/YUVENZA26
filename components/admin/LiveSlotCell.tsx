"use client";

/**
 * Live "registered / capacity" cell for the admin events table. Every cell on
 * the page shares one Realtime channel (see useLiveSlots), so counts tick up
 * the moment a registration is paid - no refresh needed.
 */
import { useLiveSlots } from "@/lib/hooks/useLiveSlots";

export default function LiveSlotCell({
  slug,
  capacity,
  initialRegistered,
}: {
  slug: string;
  capacity: number | null;
  initialRegistered: number;
}) {
  const counts = useLiveSlots({ [slug]: initialRegistered });
  const registered = counts[slug] ?? initialRegistered;
  const full = capacity !== null && registered >= capacity;

  return (
    <span className={`adm-pill ${full ? "failed" : registered > 0 ? "active" : ""}`} aria-live="polite">
      {registered}
      {capacity !== null ? ` / ${capacity}` : " registered"}
      {full ? " · FULL" : ""}
    </span>
  );
}
