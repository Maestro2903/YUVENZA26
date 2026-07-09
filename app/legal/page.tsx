import type { Metadata } from "next";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Yuvenza | Legal",
  description: "Terms, privacy and registration basics for the Yuvenza website.",
};

const INSTAGRAM = "https://www.instagram.com/yuvenza_cit/";

const SECTIONS = [
  {
    n: "01",
    title: "About this site",
    body: "This is the official website of Yuvenza, the student-driven youth club of Chennai Institute of Technology. It exists to share our work, announce events and help students take part in our initiatives. By using the site you agree to these basics.",
  },
  {
    n: "02",
    title: "Registrations & Fees",
    body: "Event entry fees shown on the Events page are in Indian Rupees. Fees support the community causes we back. The current checkout is a demo and does not process real payments; a secure payment provider will be connected before registrations go live. Places are confirmed only once a registration is completed through the official channel we announce.",
  },
  {
    n: "03",
    title: "Privacy",
    body: "If you register for an event we collect only what we need to reach you, such as your name, email, phone and college. We use it to confirm your entry and share event updates. We do not sell your data or pass it to third parties beyond what a registration requires.",
  },
  {
    n: "04",
    title: "Imagery",
    body: "Photography on this site is shown as labelled placeholders while our own event imagery is prepared. Final images will feature Yuvenza's own work and members, shared with their consent.",
  },
  {
    n: "05",
    title: "Contact",
    body: "Questions about anything here? Reach us on Instagram and we'll get back to you.",
  },
];

export default function LegalPage() {
  return (
    <AppShell bodyClass="beige" current="index" appClass="app" intro="fade">
      <div className="ho">
        <header className="ho-hero">
          <div className="ho-kicker">
            <span>Yuvenza · The Youth Club</span>
            <span>Legal</span>
          </div>
          <h1 className="ho-title">Legal</h1>
          <div className="ho-hero-b">
            <p className="ho-tagline">The fine print, kept simple.</p>
            <div className="ho-hero-r">
              <p className="ho-lead">
                The terms, privacy basics and registration notes for using this site and taking
                part in our events. Plain language, no surprises.
              </p>
            </div>
          </div>
        </header>

        <section className="ab-do">
          <ol className="ab-do-list">
            {SECTIONS.map((s) => (
              <li className="ab-do-item" key={s.n}>
                <span className="ab-do-num">{s.n}</span>
                <span className="ab-do-title">{s.title}</span>
                <span className="ab-do-body">{s.body}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="ab-join">
          <div className="ab-join-inner">
            <p className="ab-join-kicker">Get in touch</p>
            <h2 className="ab-join-head">
              Say hell<span className="f-span space">o</span>
            </h2>
            <div className="ab-join-links">
              <a href={INSTAGRAM} target="_blank" rel="noopener" className="ab-join-link">
                @yuvenza_cit
              </a>
            </div>
          </div>
        </section>

        <footer className="ab-foot">
          <span>Yuvenza© CIT</span>
          <span>What we create, we contribute</span>
        </footer>
      </div>
    </AppShell>
  );
}
