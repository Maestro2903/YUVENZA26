import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import EventsShowcase from "@/components/EventsShowcase";
import { getEventRegistrations, getEvents, getSection } from "@/lib/content/queries";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Yuvenza | Events",
  description:
    "The full line-up of Yuvenza's flagship fest - dates, times, fees and live slot availability for every event. Every fee funds the community causes we back.",
};

export default async function EventsPage() {
  const [events, fest, slotCounts] = await Promise.all([
    getEvents(),
    getSection("fest"),
    getEventRegistrations(),
  ]);

  return (
    <AppShell bodyClass="beige" current="events" appClass="app" intro="fade">
      <div className="evx">
        <header className="ev-masthead">
          <div className="ev-kicker">
            <span>
              {fest.name} · {fest.venue}
            </span>
            <span>{fest.dateLabel}</span>
          </div>
          <h1 className="ev-h1">
            Ev<span className="f-span space">e</span>nts
          </h1>
          <p className="ev-lead">
            Everything happening at the fest - what it is, when it runs and how many slots are
            left, live. Pick your favourites and register in one go.
          </p>
        </header>

        <EventsShowcase events={events} initialSlotCounts={slotCounts} />

        <footer className="evx-foot">
          <a href="/registration" className="hm-events-cta">
            Register now ↗&#xFE0E;
          </a>
        </footer>
      </div>
    </AppShell>
  );
}
