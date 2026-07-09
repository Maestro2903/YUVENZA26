import AppShell from "@/components/AppShell";
import Placeholder from "@/components/Placeholder";
import { AVATARS, IMAGES } from "@/lib/data";
import {
  nextCase,
  prevCase,
  type CaseStudy as CaseStudyType,
} from "@/lib/caseStudies";

/* eslint-disable @next/next/no-img-element */

const ASSET = {
  scratch: IMAGES + "scratch.png",
  backAll: IMAGES + "back-all.svg",
  gallery: IMAGES + "gallery.svg",
};

/** Text marquee content (repeated), replacing the old marquee image. */
function MarqueeGroup() {
  return (
    <span className="cs-mq-group">
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={i} className="cs-mq-item">
          Yuvenza <span className="cs-mq-dot">✳</span> What we create, we contribute{" "}
          <span className="cs-mq-dot">✳</span>{" "}
        </span>
      ))}
    </span>
  );
}

/** A small paper-language card used for the previous / next project pager. */
function PagerCard({
  study,
  kind,
}: {
  study: CaseStudyType;
  kind: "prev" | "next";
}) {
  return (
    <a href={`/work/${study.slug}`} className={`cs-pager-card ${kind}`} aria-label={study.title}>
      <span className="cs-pager-label">{kind === "prev" ? "Previous" : "Next Project"}</span>
      <span className="cs-pager-thumb" aria-hidden="true">
        <Placeholder />
      </span>
      <span className="cs-pager-name">{study.title}</span>
      <span className="cs-pager-meta">
        {study.category} <span className="cs-dot">·</span> {study.year}
      </span>
    </a>
  );
}

/**
 * The single template every /work/[slug] page renders through. Content is
 * fully data-driven from lib/caseStudies.ts, so all project pages share one
 * layout: ripped-paper cover, project title + client/category/year meta bar,
 * drop-cap write-up, the "Work Story" block and a previous/next pager.
 */
export default function CaseStudy({ study }: { study: CaseStudyType }) {
  const next = nextCase(study.slug);
  const prev = prevCase(study.slug);
  const story =
    study.story ??
    `${study.title} is presented through a bespoke digital experience, bringing motion, typography and creative coding together into one cohesive story.`;

  return (
    <AppShell bodyClass="work-case" current="work" appClass="app case" intro="fade">
      {/* Cover with ripped-paper reveal + project title / meta overlay */}
      <div className="case-intro">
        <div data-scroll="0" className="cover">
          <div className="c-inner blend">
            <Placeholder />
          </div>
          <div className="ripped-wrap">
            <div className="c-ripped" />
            <img src={ASSET.scratch} loading="lazy" alt="" className="scratch" />
          </div>

          <div className="cs-hero">
            <div className="cs-hero-inner">
              <div className="cs-eyebrow">{study.category}</div>
              <h1 className="cs-title">{study.title}</h1>
            </div>
            <div className="cs-bar">
              <span className="cs-bar-cell">
                <span className="cs-bar-key">{study.client ? "Partner" : "Focus"}</span>
                <span className="cs-bar-val">{study.client ?? study.category}</span>
              </span>
              <span className="cs-bar-cell center">
                <span className="cs-bar-key">Discipline</span>
                <span className="cs-bar-val">{study.category}</span>
              </span>
              <span className="cs-bar-cell right">
                <span className="cs-bar-key">Year</span>
                <span className="cs-bar-val">© {study.year}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Back to all work */}
      <a
        draggable={false}
        aria-label="Yuvenza Work"
        rel="noopener"
        href="/work"
        className="back-all w-inline-block"
      >
        <div className="button-ico">
          <img src={ASSET.backAll} loading="lazy" alt="" className="img" />
        </div>
        <div className="button-text back">
          Ba<span className="f-span">c</span>k All
        </div>
      </a>

      <div className="case-wrap">
        <div className="case-marquee">
          <div className="cs-mq" aria-hidden="true">
            <div className="cs-mq-row">
              <MarqueeGroup />
              <MarqueeGroup />
            </div>
          </div>
        </div>

        {/* Intro write-up */}
        <div className="case-info">
          <div className="cs-rule" />
          <div className="pr-info-w">
            <div className="case-desc about w-embed">
              <h5 className="has-dropcap">{study.desc}</h5>
            </div>
          </div>
          {study.liveSite && (
            <a
              rel="noopener"
              aria-label="Yuvenza Live Site"
              draggable={false}
              href={study.liveSite}
              target="_blank"
              className="cta-h work w-inline-block"
            >
              <div className="cta-text work">Live Site</div>
              <img src={AVATARS.arrow} loading="lazy" alt="" className="arrow case" />
            </a>
          )}
        </div>

        {/* Work story + feature image */}
        <div className="case-extra">
          <div className="ex-col">
            <div className="col-e dash">
              <div className="flex float">
                <h2 className="p-h2 b">The</h2>
                <img src={AVATARS.stamp} loading="lazy" alt="" className="f-stamp p" />
              </div>
              <h2 className="p-h2 b">
                <span className="space-2">W</span>
                <span className="f-span space sp-2">o</span>rk
              </h2>
              <h2 className="p-h2 bg">
                St<span className="f-span close">o</span>ry
              </h2>
              <div className="case-desc wrap">
                <div className="case-desc about w-embed">
                  <h5 className="has-dropcap">{story}</h5>
                </div>
              </div>
            </div>
          </div>
          <div className="pw-wrap blend">
            <div id="fixed-target" data-scroll="0" className="pw-inner">
              <div data-scroll-speed="-1" data-scroll="0" className="pw-img blend">
                <Placeholder />
              </div>
            </div>
            <div className="gallery-open">
              <div className="button-ico">
                <img src={ASSET.gallery} loading="lazy" alt="" className="img" />
              </div>
              <div className="button-text">
                <span className="f-span space">G</span>allery
              </div>
            </div>
          </div>
        </div>

        {/* Previous / next project pager */}
        <nav className="cs-more" aria-label="More projects">
          <PagerCard study={prev} kind="prev" />
          <div className="cs-more-mid">
            <span className="cs-more-kicker">More</span>
            <span className="cs-more-head">
              W<span className="f-span space">o</span>rk!
            </span>
          </div>
          <PagerCard study={next} kind="next" />
        </nav>
      </div>
    </AppShell>
  );
}
