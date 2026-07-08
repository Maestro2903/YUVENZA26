"use client";

import { indexLeft, indexRight } from "@/data/projects";
import ProjectCard from "./ProjectCard";
import { useDragScroll } from "@/hooks/useDragScroll";

/**
 * The draggable index gallery: left project set → centered "All Work!"
 * headline → right project set, all on one horizontally-scrollable rail.
 */
export default function IndexGallery() {
  const rail = useDragScroll<HTMLDivElement>();

  return (
    <header className="sidebar init" id="index">
      <div className="s-container" ref={rail}>
        <div className="s-inner">
          <div className="s-grid">
            {indexLeft.map((p) => (
              <ProjectCard key={p.slug} project={p} />
            ))}
          </div>

          <div className="headline m">
            <a href="#work" className="head-wrap">
              <div className="head-title">
                All W<span className="dom">o</span>rk!
              </div>
              <svg
                className="head-embed"
                viewBox="0 0 320 120"
                preserveAspectRatio="none"
              >
                <ellipse cx="160" cy="60" rx="150" ry="52" />
              </svg>
            </a>
            <div className="head-desc">
              A featured selection —
              <br />
              the latest work of
              <br />
              the last few years.
            </div>
            <div className="head-caption">
              <div className="item-title cap">tip!</div>
              <div className="item-desc cap">Drag sideways to navigate</div>
            </div>
          </div>

          <div className="s-grid">
            {indexRight.map((p) => (
              <ProjectCard key={p.slug} project={p} />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
