/* eslint-disable @next/next/no-img-element */
import AppShell from "@/components/AppShell";
import Placeholder from "@/components/Placeholder";
import Countdown from "@/components/Countdown";
import { AVATARS } from "@/lib/data";
import { CASE_BY_SLUG, CASE_STUDIES } from "@/lib/caseStudies";
import { EVENTS, INR } from "@/lib/events";

const INSTAGRAM = "https://www.instagram.com/yuvenza_cit/";
const LINKEDIN = "https://www.linkedin.com/company/yuvenza-cit/";

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

const PILLARS = [
  {
    n: "01",
    title: "Passion",
    body: "Everything starts with students who care. We turn raw energy into events, campaigns and drives that mean something.",
  },
  {
    n: "02",
    title: "Creativity",
    body: "We design our own way of giving back, blending fresh ideas with hands-on work so every initiative feels alive.",
  },
  {
    n: "03",
    title: "Unity",
    body: "Change is a team sport. We rally the campus together and move as one behind the causes that matter.",
  },
];

const STATS = [
  { num: "2023", label: "Founded at CIT" },
  { num: "2.1K+", label: "Strong community" },
  { num: "9", label: "Causes backed" },
  { num: "100%", label: "Student led" },
];

const QUOTES = [
  {
    text: "Yuvenza turned our energy into purpose. Every event we run gives straight back to a cause that matters.",
    name: "The Core Team",
    role: "Yuvenza · CIT",
  },
  {
    text: "Igniting passion, creativity and unity, that's the spirit we carry into every campaign and drive.",
    name: "Our Volunteers",
    role: "Community Outreach",
  },
  {
    text: "What we create, we contribute. It isn't just a line, it's how every member shows up.",
    name: "The Council",
    role: "Chennai Institute of Technology",
  },
];

export default function Home() {
  return (
    <AppShell bodyClass="beige" current="index" intro="fade">
      <div className="ho">
        {/* ===================== Hero ===================== */}
        <header className="ho-hero">
          <div className="ho-kicker">
            <span>The Youth Club · Chennai Institute of Technology</span>
            <span>Est. 2023</span>
          </div>
          <h1 className="ho-title">Yuvenza</h1>
          <div className="ho-hero-b">
            <p className="ho-tagline">
              Igniting passion, creativity &amp; unity.
            </p>
            <div className="ho-hero-r">
              <p className="ho-lead">
                Yuvenza is the student-driven youth club of Chennai Institute of Technology.
                What we create, we contribute. Every event and campaign we run channels real
                support back to the community around us.
              </p>
              <div className="ho-cta-row">
                <a href="/work" className="ho-cta">
                  Our Work <span aria-hidden="true">↗</span>
                </a>
                <a href="/registration" className="ho-cta ghost">
                  Register <span aria-hidden="true">↗</span>
                </a>
                <a href={INSTAGRAM} target="_blank" rel="noopener" className="ho-cta ghost">
                  Join Us <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* ===================== Countdown (next to the hero) ===================== */}
        <Countdown />

        {/* ===================== Statement (the youth powered club) ===================== */}
        <section className="ho-statement">
          <h2 className="ho-statement-head">
            The Youth
            <br />
            P<span className="f-span">o</span>wered Club
          </h2>
          <p className="ho-statement-body">
            Since 2023, we&#x27;ve rallied students at Chennai Institute of Technology behind
            social causes, driving real impact and awareness through kindness. From blind-school
            visits to poverty, Braille and environmental drives.
          </p>
        </section>

        {/* ===================== Manifesto ===================== */}
        <section className="ab-manifesto">
          <div className="ab-manifesto-copy">
            <div className="case-desc about w-embed">
              <h5 className="has-dropcap">
                We believe in the power of youth to create meaningful change. Every event and
                initiative we run channels funds and energy straight back into social causes that
                make a real difference. Small acts of kindness make the biggest difference.
              </h5>
            </div>
          </div>
          <div className="ab-manifesto-aside">
            <img src={AVATARS.stamp} loading="lazy" alt="" className="ab-stamp" />
            <div className="ab-tagline head-wrap">
              <span className="ab-tagline-text">Create &amp; Contribute</span>
              <Doodle />
            </div>
          </div>
        </section>

        {/* ===================== Pillars ===================== */}
        <section className="ab-values">
          <h2 className="ab-sec-head">
            What we stand f<span className="f-span space">o</span>r
          </h2>
          <div className="ab-values-grid">
            {PILLARS.map((p) => (
              <div className="ab-value" key={p.n}>
                <span className="ab-value-num">{p.n}</span>
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
              <span>Selected Work</span>
              <span>Scroll to explore →</span>
            </div>
            <h2 className="hm-events-title">
              Our W<span className="f-span space">o</span>rk
            </h2>
            <p className="hm-events-lead">
              The events, campaigns and community initiatives we&#x27;ve shaped so far.
            </p>
          </div>
          <div className="ho-rail">
            {CASE_STUDIES.map((w) => (
              <a
                key={w.slug}
                href={`/work/${w.slug}`}
                className="ho-rail-card"
                aria-label={w.title}
              >
                <span className="ho-rail-thumb">
                  <Placeholder />
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
              <span>What&#x27;s On</span>
              <span>The Flagship Fest · Feb 2026</span>
            </div>
            <h2 className="hm-events-title">
              Ev<span className="f-span space">e</span>nts
            </h2>
            <p className="hm-events-lead">
              Pick the entries you want, register in one go, and every fee flows straight into the
              causes we back.
            </p>
          </div>
          <ul className="hm-events-grid">
            {EVENTS.slice(0, 3).map((e) => (
              <li key={e.id} className="hm-ev-card">
                <span className="hm-ev-cat">{e.category}</span>
                <h3 className="hm-ev-name">{e.title}</h3>
                <div className="hm-ev-meta">
                  <span>{e.date}</span>
                  <span className="hm-ev-price">{INR(e.price)}</span>
                </div>
              </li>
            ))}
          </ul>
          <a href="/registration" className="hm-events-cta">
            Register now ↗
          </a>
        </section>

        {/* ===================== Testimonials ===================== */}
        <section className="ho-quotes">
          <h2 className="ab-sec-head">
            In their w<span className="f-span space">o</span>rds
          </h2>
          <div className="ho-quotes-grid">
            {QUOTES.map((q) => (
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
          {STATS.map((s) => (
            <div className="ab-stat" key={s.label}>
              <span className="ab-stat-num">{s.num}</span>
              <span className="ab-stat-label">{s.label}</span>
            </div>
          ))}
        </section>

        {/* ===================== Join CTA ===================== */}
        <section className="ab-join">
          <div className="ab-join-inner">
            <p className="ab-join-kicker">Let&#x27;s create change together</p>
            <h2 className="ab-join-head">
              J<span className="f-span space">o</span>in the movement
            </h2>
            <div className="ab-join-links">
              <a href={INSTAGRAM} target="_blank" rel="noopener" className="ab-join-link">
                Insta<span className="f-span">g</span>ram
              </a>
              <a href={LINKEDIN} target="_blank" rel="noopener" className="ab-join-link">
                Linke<span className="f-span">d</span>in
              </a>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
