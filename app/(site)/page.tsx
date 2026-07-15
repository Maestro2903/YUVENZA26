 
import AppShell from "@/components/AppShell";
import Placeholder from "@/components/Placeholder";
import Countdown from "@/components/Countdown";
import { renderAccents } from "@/components/Accents";
import { AVATARS } from "@/lib/data";
import { getEvents, getGeneralSettings, getSections, getWorkItems } from "@/lib/content/queries";
import { INR } from "@/lib/content/types";

// Refresh static content every 5 minutes; admin edits also revalidate on save.
export const revalidate = 300;

/** The hand-drawn sage ellipse that strokes on hover. */
function Doodle() {
  return (
    <div className="head-embed w-embed" aria-hidden="true">
      <svg id="headline" viewBox="0 0 500 146" xmlSpace="preserve">
        <ellipse
          className="head doodle-hover"
          style={{ fill: "none", stroke: "#1d1d1b", strokeWidth: 2, strokeMiterlimit: 10 }}
          cx="250"
          cy="72.9"
          rx="242.4"
          ry="68.5"
        />
      </svg>
    </div>
  );
}

export default async function Home() {
  const [sections, work, events, settings] = await Promise.all([
    getSections(),
    getWorkItems(),
    getEvents(),
    getGeneralSettings(),
  ]);
  const { hero, statement, manifesto, pillars, workSection, eventsSection, quotes, stats, join, fest } =
    sections;

  return (
    <AppShell bodyClass="beige" current="index" intro="fade">
      <div className="ho">
        {/* ===================== Hero ===================== */}
        <header className="ho-hero">
          <p className="ho-kicker">
            <span>{hero.kickerLeft}</span>
            <span>{hero.kickerRight}</span>
          </p>

          <div className="ho-title-w">
            <h1 className="ho-title">Yuvenza</h1>
            <img
              src={AVATARS.stamp}
              alt=""
              aria-hidden="true"
              loading="eager"
              className="ho-title-stamp"
            />
          </div>

          <div className="ho-hero-b">
            <div className="ho-hero-l">
              <p className="ho-tagline">{renderAccents(hero.tagline)}</p>
              {hero.facts.length > 0 && (
                <ul className="ho-facts">
                  {hero.facts.map((fact) => (
                    <li key={fact} className="ho-fact">
                      {fact}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="ho-hero-r">
              <p className="ho-lead">{hero.lead}</p>
              <div className="ho-cta-row">
                <a href={hero.primaryCta.href} className="ho-cta primary">
                  {hero.primaryCta.label} <span aria-hidden="true">↗</span>
                </a>
                <a href={hero.secondaryCta.href} className="ho-cta ghost">
                  {hero.secondaryCta.label} <span aria-hidden="true">↗</span>
                </a>
                <a
                  href={hero.tertiaryCta.href}
                  target={hero.tertiaryCta.href.startsWith("http") ? "_blank" : undefined}
                  rel={hero.tertiaryCta.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="ho-cta text"
                >
                  {hero.tertiaryCta.label} <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* ===================== Countdown (next to the hero) ===================== */}
        <Countdown targetIso={fest.countdownTarget} dateLabel={fest.countdownDateLabel} />

        {/* ===================== Statement (the youth powered club) ===================== */}
        <section className="ho-statement">
          <h2 className="ho-statement-head">{renderAccents(statement.heading)}</h2>
          <p className="ho-statement-body">{statement.body}</p>
        </section>

        {/* ===================== Manifesto ===================== */}
        <section className="ab-manifesto">
          <div className="ab-manifesto-copy">
            <div className="case-desc about w-embed">
              <h5 className="has-dropcap">{manifesto.body}</h5>
            </div>
          </div>
          <div className="ab-manifesto-aside">
            <img src={AVATARS.stamp} loading="lazy" alt="" className="ab-stamp" />
            <div className="ab-tagline head-wrap">
              <span className="ab-tagline-text">{manifesto.tagline}</span>
              <Doodle />
            </div>
          </div>
        </section>

        {/* ===================== Pillars ===================== */}
        <section className="ab-values">
          <h2 className="ab-sec-head">{renderAccents(pillars.heading)}</h2>
          <div className="ab-values-grid">
            {pillars.items.map((p) => (
              <div className="ab-value" key={p.num}>
                <span className="ab-value-num">{p.num}</span>
                <h3 className="ab-value-title">{p.title}</h3>
                <p className="ab-value-body">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===================== Featured work ===================== */}
        <section className="hm-events">
          <div className="hm-events-head">
            <div className="hm-kicker">
              <span>{workSection.kickerLeft}</span>
              <span>{workSection.kickerRight}</span>
            </div>
            <h2 className="hm-events-title">{renderAccents(workSection.heading)}</h2>
            {workSection.lead && <p className="hm-events-lead">{workSection.lead}</p>}
          </div>
          <div className="ho-rail">
            {work.map((w) => (
              <a key={w.slug} href={`/work/${w.slug}`} className="ho-rail-card" aria-label={w.title}>
                <span className="ho-rail-thumb">
                  {w.coverUrl ? (
                    <img src={w.coverUrl} alt={w.coverAlt ?? ""} loading="lazy" className="cover-img" />
                  ) : (
                    <Placeholder />
                  )}
                </span>
                <span className="hm-ev-cat">{w.category}</span>
                <h3 className="ho-rail-name">{w.title}</h3>
                <span className="ho-rail-year">{w.year}</span>
              </a>
            ))}
          </div>
          <a href="/work" className="hm-events-cta">
            See all work ↗
          </a>
        </section>

        {/* ===================== Featured events ===================== */}
        <section className="hm-events">
          <div className="hm-events-head">
            <div className="hm-kicker">
              <span>{eventsSection.kickerLeft}</span>
              <span>
                {fest.name} · {fest.dateLabel}
              </span>
            </div>
            <h2 className="hm-events-title">{renderAccents(eventsSection.heading)}</h2>
            {eventsSection.lead && <p className="hm-events-lead">{eventsSection.lead}</p>}
          </div>
          <ul className="hm-events-grid">
            {events.slice(0, 3).map((e) => (
              <li key={e.slug} className="hm-ev-card">
                <span className="hm-ev-cat">{e.category}</span>
                <h3 className="hm-ev-name">{e.title}</h3>
                <div className="hm-ev-meta">
                  <span>{e.dateLabel}</span>
                  <span className="hm-ev-price">{INR(e.price)}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="hm-events-cta-row">
            <a href="/events" className="hm-events-cta">
              All events ↗
            </a>
            <a href="/registration" className="hm-events-cta">
              Register now ↗
            </a>
          </div>
        </section>

        {/* ===================== Testimonials ===================== */}
        <section className="ho-quotes">
          <h2 className="ab-sec-head">{renderAccents(quotes.heading)}</h2>
          <div className="ho-quotes-grid">
            {quotes.items.map((q) => (
              <figure className="ho-quote" key={q.name}>
                <blockquote className="ho-quote-text">“{q.text}”</blockquote>
                <figcaption className="ho-quote-by">
                  <span className="ho-quote-name">{q.name}</span>
                  <span className="ho-quote-role">{q.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ===================== Impact stats ===================== */}
        <section className="ab-stats">
          {stats.items.map((s) => (
            <div className="ab-stat" key={s.label}>
              <span className="ab-stat-num">{s.num}</span>
              <span className="ab-stat-label">{s.label}</span>
            </div>
          ))}
        </section>

        {/* ===================== Join CTA ===================== */}
        <section className="ab-join">
          <div className="ab-join-inner">
            <p className="ab-join-kicker">{join.kicker}</p>
            <h2 className="ab-join-head">{renderAccents(join.heading)}</h2>
            <div className="ab-join-links">
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ab-join-link"
              >
                Insta<span className="f-span">g</span>ram
              </a>
              <a
                href={settings.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ab-join-link"
              >
                Linke<span className="f-span">d</span>in
              </a>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
