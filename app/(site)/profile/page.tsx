import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import ProfileClient from "@/components/ProfileClient";
import { getEvents, getRegistrationSettings } from "@/lib/content/queries";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Yuvenza | Profile",
  description:
    "Your Yuvenza account: registrations, entry passes and ticket downloads for the fest.",
  robots: { index: false },
};

export default async function ProfilePage() {
  const [events, registration] = await Promise.all([getEvents(), getRegistrationSettings()]);

  return (
    <AppShell bodyClass="beige" current="profile" appClass="app" intro="fade">
      <div className="pf">
        <header className="ev-masthead">
          <div className="ev-kicker">
            <span>Your account</span>
            <span>Yuvenza · The Youth Club</span>
          </div>
          <h1 className="ev-h1">
            Pr<span className="f-span space">o</span>file
          </h1>
        </header>

        <ProfileClient events={events} allowedEmailDomain={registration.allowedEmailDomain} />
      </div>
    </AppShell>
  );
}
