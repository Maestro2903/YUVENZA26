/* eslint-disable @next/next/no-img-element */
import AppShell from "@/components/AppShell";
import Placeholder from "@/components/Placeholder";
import { AVATARS } from "@/lib/data";

const INSTAGRAM = "https://www.instagram.com/yuvenza_cit/";
const LINKEDIN = "https://www.linkedin.com/company/yuvenza-cit/";

/** The hand-drawn sage ellipse that strokes on hover (reused from the home doodle). */
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

const INITIATIVES = [
  {
    n: "01",
    title: "Blind School Visits",
    body: "Time, supplies and companionship for the students of Victoria Memorial Blind School.",
  },
  {
    n: "02",
    title: "Girl Child Home Support",
    body: "Standing with a girl child home shelter through the Christmas season and beyond.",
  },
  {
    n: "03",
    title: "Poverty Awareness",
    body: "Drives that spotlight poverty eradication and rally students behind those in need.",
  },
  {
    n: "04",
    title: "Braille & Accessibility",
    body: "Building awareness for accessibility and the tools that make the world reachable for everyone.",
  },
  {
    n: "05",
    title: "Environmental Drives",
    body: "Campaigns for environmental responsibility that carry from campus into the city.",
  },
  {
    n: "06",
    title: "Youth Mentoring",
    body: "Guiding fellow students on leadership, growth and personal development.",
  },
];

export default function Page() {
  return (
    <AppShell bodyClass="beige" current="about" appClass="app" intro="fade">
      <div className="ab">
        {/* ===================== Masthead ===================== */}
        <header className="ab-masthead">
          <div className="ab-kicker">
            <span>The Youth Club of Chennai Institute of Technology</span>
            <span>Est. 2023</span>
          </div>
          <h1 className="ab-h1">
            Ab<span className="f-span space">o</span>ut Us
          </h1>
          <div className="ab-lead-row">
            <p className="ab-lead">
              Igniting passion, creativity and unity. Yuvenza is the student driven youth club
              of Chennai Institute of Technology, dedicated to giving back to society.
            </p>
            <div className="ab-lead-mark">
              <Placeholder label="Logo" style={{ width: "13vw", height: "8.5vw" }} />
            </div>
          </div>
        </header>

        {/* ===================== Manifesto ===================== */}
        <section className="ab-manifesto">
          <div className="ab-manifesto-copy">
            <div className="case-desc about w-embed">
              <h5 className="has-dropcap">
                At Yuvenza, we believe in the power of youth to create meaningful change. What we
                create, we contribute. Every event and initiative we run channels funds and energy
                straight back into social causes that make a real difference in our community.
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

        {/* ===================== Stats ===================== */}
        <section className="ab-stats">
          {STATS.map((s) => (
            <div className="ab-stat" key={s.label}>
              <span className="ab-stat-num">{s.num}</span>
              <span className="ab-stat-label">{s.label}</span>
            </div>
          ))}
        </section>

        {/* ===================== What we do ===================== */}
        <section className="ab-do">
          <h2 className="ab-sec-head">
            What we d<span className="f-span space">o</span>
          </h2>
          <ol className="ab-do-list">
            {INITIATIVES.map((it) => (
              <li className="ab-do-item" key={it.n}>
                <span className="ab-do-num">{it.n}</span>
                <span className="ab-do-title">{it.title}</span>
                <span className="ab-do-body">{it.body}</span>
              </li>
            ))}
          </ol>
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

        <footer className="ab-foot">
          <span>Yuvenza© CIT</span>
          <span>What we create, we contribute</span>
        </footer>
      </div>
    </AppShell>
  );
}
