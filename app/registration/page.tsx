import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import EventsClient from "@/components/EventsClient";

export const metadata: Metadata = {
  title: "Yuvenza | Registration",
  description:
    "Register for the events at Yuvenza's flagship fest. Pick your entries and pay in one go. Every fee funds the community causes we back.",
};

export default function RegistrationPage() {
  return (
    <AppShell bodyClass="beige" current="registration" appClass="app" intro="fade">
      <EventsClient />
    </AppShell>
  );
}
