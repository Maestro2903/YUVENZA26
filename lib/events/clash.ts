/**
 * Event time-clash logic. Pure and client-safe - the registration UI uses it
 * to disable clashing entries, and the checkout API re-applies the exact same
 * rule server-side so it can't be bypassed.
 *
 * Two events clash when they are on the same date and their time ranges
 * overlap. Events without a complete date + start + end are "open" (multi-day
 * sprints, open-entry contests) and never clash.
 */
import type { EventItem } from "@/lib/content/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

type Span = { date: string; start: number; end: number };

function toMinutes(time: string): number | null {
  const m = TIME_RE.exec(time);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function getEventSpan(e: Pick<EventItem, "eventDate" | "startTime" | "endTime">): Span | null {
  if (!e.eventDate || !DATE_RE.test(e.eventDate) || !e.startTime || !e.endTime) return null;
  const start = toMinutes(e.startTime);
  const end = toMinutes(e.endTime);
  if (start === null || end === null || end <= start) return null;
  return { date: e.eventDate, start, end };
}

export function eventsClash(a: EventItem, b: EventItem): boolean {
  const sa = getEventSpan(a);
  const sb = getEventSpan(b);
  if (!sa || !sb || sa.date !== sb.date) return false;
  return sa.start < sb.end && sb.start < sa.end;
}

/** First already-selected event that clashes with the candidate, if any. */
export function findClash(candidate: EventItem, selected: EventItem[]): EventItem | null {
  for (const other of selected) {
    if (other.slug === candidate.slug) continue;
    if (eventsClash(candidate, other)) return other;
  }
  return null;
}

/** All clashing pairs within a selection (for server-side validation). */
export function findClashesWithin(events: EventItem[]): [EventItem, EventItem][] {
  const pairs: [EventItem, EventItem][] = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (eventsClash(events[i], events[j])) pairs.push([events[i], events[j]]);
    }
  }
  return pairs;
}

/** "10:00" -> "10:00 AM"; used for display on event cards. */
export function formatTime(time: string): string {
  const mins = toMinutes(time);
  if (mins === null) return time;
  const h24 = Math.floor(mins / 60);
  const mm = String(mins % 60).padStart(2, "0");
  const suffix = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${suffix}`;
}

export function formatTimeRange(start?: string, end?: string): string | null {
  if (!start || !end) return null;
  return `${formatTime(start)} – ${formatTime(end)}`;
}
