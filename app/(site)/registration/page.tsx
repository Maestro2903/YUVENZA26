import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import EventsClient from "@/components/EventsClient";
import { getEvents, getRegistrationSettings, getSection } from "@/lib/content/queries";
import { getRazorpayConfig } from "@/lib/razorpay/server";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Yuvenza | Registration",
  description:
    "Register for the events at Yuvenza's flagship fest. Sign in with your college Google account, pick your entries and pay in one go. Every fee funds the community causes we back.",
};

export default async function RegistrationPage() {
  const [events, fest, registration] = await Promise.all([
    getEvents(),
    getSection("fest"),
    getRegistrationSettings(),
  ]);
  // Only used for messaging; the checkout API decides the real mode per request.
  const paymentsLive = Boolean(await getRazorpayConfig().catch(() => null));

  return (
    <AppShell bodyClass="beige" current="registration" appClass="app" intro="fade">
      <EventsClient
        events={events}
        festName={fest.name}
        festDateLabel={fest.dateLabel}
        paymentsLive={paymentsLive}
        requireLogin={registration.requireLogin}
        allowedEmailDomain={registration.allowedEmailDomain}
      />
    </AppShell>
  );
}
