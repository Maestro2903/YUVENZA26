import { type CaseStudy } from "@/lib/caseStudies";
import Placeholder from "@/components/Placeholder";

type ItemProps = {
  study: CaseStudy;
  /** margin variant on the outer .item element */
  variant?: "l" | "fl" | "fr" | "";
  /** render without the anchor (e.g. the "Upcoming Next" teaser) */
  noLink?: boolean;
  /** flag a fresh initiative with the "New" badge */
  isNew?: boolean;
  dataColor?: string;
};

/**
 * A single work card as used across every rail (`.item`) on the site.
 * Content is driven by the shared CaseStudy data. The cover is a placeholder
 * until real imagery is dropped in; the title renders as paper-language text.
 */
export default function Item({
  study,
  variant = "l",
  noLink = false,
  isNew = false,
  dataColor,
}: ItemProps) {
  const inner = (
    <>
      <div className="item-img-w">
        <div className="item-img w-embed">
          <Placeholder />
        </div>
      </div>
      <div className="item-block">
        <div className="item-tw text">
          <div className="item-t-text">{study.title}</div>
          <div className={"new-w-2 sp" + (isNew ? "" : " w-condition-invisible")}>
            <div className="new-2">New</div>
          </div>
        </div>
        <div className="item-desc">{study.desc}</div>
      </div>
    </>
  );

  return (
    <div role="listitem" className={`item ${variant} w-dyn-item`.trim()}>
      {noLink ? (
        <div draggable={false} aria-label="Yuvenza Work" rel="noopener" className="item-link">
          {inner}
        </div>
      ) : (
        <a
          draggable={false}
          aria-label="Yuvenza Work"
          rel="noopener"
          href={`/work/${study.slug}`}
          data-color={dataColor}
          className="item-link w-inline-block"
        >
          {inner}
        </a>
      )}
    </div>
  );
}
