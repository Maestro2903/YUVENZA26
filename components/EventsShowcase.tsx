"use client";

 

/**
 * Public events showcase: rich cards with the admin-uploaded 4:3 image, the
 * full write-up, schedule and LIVE remaining slots (streamed over Supabase
 * Realtime - counts change on the page the moment someone registers).
 */
import Placeholder from "@/components/Placeholder";
import { INR, type EventItem } from "@/lib/content/types";
import { formatTimeRange } from "@/lib/events/clash";
import { isSoldOut, slotsLabel } from "@/lib/events/capacity";
import { useLiveSlots } from "@/lib/hooks/useLiveSlots";

export default function EventsShowcase({
  events,
  initialSlotCounts = {},
}: {
  events: EventItem[];
  initialSlotCounts?: Record<string, number>;
}) {
  const counts = useLiveSlots(initialSlotCounts);

  return (
    <ol className="evx-list">
      {events.map((event, i) => {
        const timeRange = formatTimeRange(event.startTime, event.endTime);
        const soldOut = isSoldOut(event, counts[event.slug]);
        const slots = slotsLabel(event, counts[event.slug]);
        return (
          <li key={event.slug} className={"evx-card" + (soldOut ? " out" : "")}>
            <a href={`/events/${event.slug}`} className="evx-media" aria-label={`${event.title} - details and rules`}>
              {event.imageUrl ? (
                <img
                  src={event.imageUrl}
                  alt={event.imageAlt ?? event.title}
                  loading={i < 2 ? "eager" : "lazy"}
                  className="evx-img"
                />
              ) : (
                <Placeholder label={event.title} />
              )}
              {event.badge && (
                <span className={"ev-badge evx-badge " + event.badge.toLowerCase()}>
                  {event.badge}
                </span>
              )}
            </a>
            <div className="evx-body">
              <div className="evx-kicker">
                <span>{event.category}</span>
                <span className={"evx-slots" + (soldOut ? " out" : "")} aria-live="polite">
                  {slots}
                </span>
              </div>
              <h2 className="evx-title">
                <a href={`/events/${event.slug}`}>{event.title}</a>
              </h2>
              <p className="evx-meta">
                {event.dateLabel}
                {timeRange && <> · {timeRange}</>}
                {event.venue && <> · {event.venue}</>}
                {" · "}
                <span className="evx-price">{INR(event.price)}</span>
              </p>
              <p className="evx-desc">{event.details || event.description}</p>
              <div className="evx-actions">
                <a href={`/events/${event.slug}`} className="ho-cta ghost evx-cta">
                  Details &amp; rules
                </a>
                {soldOut ? (
                  <span className="ho-cta ghost evx-cta" aria-disabled="true">
                    Sold out
                  </span>
                ) : (
                  <a href="/registration" className="ho-cta primary evx-cta">
                    Register <span aria-hidden="true">↗&#xFE0E;</span>
                  </a>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
