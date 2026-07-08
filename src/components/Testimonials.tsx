"use client";

import { testimonials } from "@/data/testimonials";
import { useDragScroll } from "@/hooks/useDragScroll";

/**
 * Testimonial cards on a draggable rail — matches the source's stacked
 * "letter" cards with round avatars and hover lift.
 */
export default function Testimonials() {
  const rail = useDragScroll<HTMLDivElement>();

  return (
    <section className="h-item testi">
      <div className="aw-block-w" ref={rail}>
        {testimonials.map((t) => (
          <div className={`aw-block s-${t.slug}`} key={t.slug}>
            <div className="aw-content">
              <div className="aw-desc">{`“${t.quote}”`}</div>
              <div className="aw-infos">
                <div className="aw-box">
                  <img
                    src={`/assets/avatars/${t.slug}.svg`}
                    alt={t.name}
                    draggable={false}
                  />
                </div>
                <div className="aw-info">
                  <h3 className="aw-name">{t.name}</h3>
                  <div className="aw-role">
                    {t.role}{" "}
                    {t.org && (
                      <a className="link" href={t.orgHref} target="_blank" rel="noreferrer">
                        {t.org}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
