import AppShell from "@/components/AppShell";
import Placeholder from "@/components/Placeholder";
import { CASE_STUDIES } from "@/lib/caseStudies";

/**
 * Work index - an editorial "table of contents" of every Yuvenza initiative in
 * giant Canopee display type, each row revealing a tilted paper thumbnail on
 * hover. Built entirely in the site's paper design language (ink on beige,
 * hairline rules, Domaine numerals) and CSS-only so it stays robust.
 */
export default function WorkPage() {
  return (
    <AppShell bodyClass="beige" current="work" appClass="app" intro="fade">
      <div className="wk">
        <header className="wk-masthead">
          <div className="wk-kicker">
            <span>The Youth Club</span>
            <span>{CASE_STUDIES.length} Initiatives · Est. 2023</span>
          </div>
          <h1 className="wk-h1">
            Our W<span className="f-span space">o</span>rk
          </h1>
          <p className="wk-lead">
            The events, campaigns and community initiatives we&#x27;ve shaped so far. What we
            create, we contribute. Hover a title to preview; select one to read the full story.
          </p>
        </header>

        <ol className="wk-list">
          {CASE_STUDIES.map((p, i) => (
            <li key={p.slug} className="wk-item">
              <a href={`/work/${p.slug}`} className="wk-row" aria-label={p.title}>
                <span className="wk-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="wk-name">{p.title}</span>
                <span className="wk-rowthumb" aria-hidden="true">
                  <Placeholder />
                </span>
                <span className="wk-meta">
                  <span className="wk-cat">{p.category}</span>
                  <span className="wk-year">{p.year}</span>
                  <span className="wk-arrow" aria-hidden="true">
                    ↗
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ol>

        <footer className="wk-foot">
          <span>Yuvenza · CIT</span>
          <span>What we create, we contribute</span>
        </footer>
      </div>
    </AppShell>
  );
}
