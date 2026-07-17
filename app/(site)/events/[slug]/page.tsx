 
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import Placeholder from "@/components/Placeholder";
import LiveSlotPill from "@/components/LiveSlotPill";
import { getEvent, getEventRegistrations, getEvents } from "@/lib/content/queries";
import { INR } from "@/lib/content/types";
import { formatTimeRange } from "@/lib/events/clash";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: "Yuvenza | Events" };
  return {
    title: `Yuvenza | ${event.title}`,
    description: event.description,
    // The admin-uploaded 4:3 image becomes the share card; pages without one
    // fall back to the branded opengraph-image at the (site) root.
    ...(event.imageUrl
      ? {
          openGraph: { title: event.title, description: event.description, images: [event.imageUrl] },
          twitter: { card: "summary_large_image" as const, images: [event.imageUrl] },
        }
      : {}),
  };
}

/** Rules are stored one per line; render the non-empty lines as a list. */
function parseRules(rules?: string): string[] {
  return (rules ?? "")
    .split("\n")
    .map((line) => line.trim().replace(/^[-*•\d.)\s]+/, "").trim() || line.trim())
    .filter(Boolean);
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [event, slotCounts] = await Promise.all([getEvent(slug), getEventRegistrations()]);
  if (!event) notFound();

  const timeRange = formatTimeRange(event.startTime, event.endTime);
  const rules = parseRules(event.rules);

  return (
    <AppShell bodyClass="beige" current="events" appClass="app" intro="fade">
      <div className="evd">
        <header className="ev-masthead">
          <div className="ev-kicker">
            <span>
              {event.category}
              {event.venue && <> · {event.venue}</>}
            </span>
            <span>
              {event.dateLabel}
              {timeRange && <> · {timeRange}</>}
            </span>
          </div>
          <h1 className="evd-h1">{event.title}</h1>
          <div className="evd-bar">
            <span className="evd-fee">{INR(event.price)}</span>
            <LiveSlotPill
              slug={event.slug}
              capacity={event.capacity}
              slots={event.slots}
              initialRegistered={slotCounts[event.slug] ?? 0}
            />
            <a href="/registration" className="ho-cta primary evd-cta">
              Register <span aria-hidden="true">↗&#xFE0E;</span>
            </a>
          </div>
        </header>

        <div className="evd-media">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.imageAlt ?? event.title} loading="eager" className="evx-img" />
          ) : (
            <Placeholder label={event.title} />
          )}
        </div>

        <div className="evd-cols">
          <section className="evd-about">
            <h2 className="evd-sec-head">
              Ab<span className="f-span space">o</span>ut
            </h2>
            <p className="evd-text">{event.details || event.description}</p>
          </section>

          <section className="evd-rules" aria-label="Event rules">
            <h2 className="evd-sec-head">
              R<span className="f-span space">u</span>les
            </h2>
            {rules.length > 0 ? (
              <ol className="evd-rules-list">
                {rules.map((rule, i) => (
                  <li key={i} className="evd-rule">
                    <span className="evd-rule-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="evd-rule-text">{rule}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="evd-text">
                No special rules - just bring your college ID and your energy. Full instructions
                arrive with your confirmation.
              </p>
            )}
          </section>
        </div>

        <footer className="evd-foot">
          <a href="/events" className="hm-events-cta">
            ← All events
          </a>
          <a href="/registration" className="hm-events-cta">
            Register now ↗&#xFE0E;
          </a>
        </footer>
      </div>
    </AppShell>
  );
}
