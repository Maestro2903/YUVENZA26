import { site } from "@/data/site";

export default function Footer() {
  const marqueeItem = (
    <div className="marquee-content">
      <h4 className="f-news">Let&apos;s create something together</h4>
      <a className="marquee-link" href={`mailto:${site.email}`}>
        <div className="marquee-text">Email Me</div>
      </a>
    </div>
  );

  return (
    <footer className="footer">
      <div className="marquee">
        <div className="marquee--inner">
          {marqueeItem}
          {marqueeItem}
          {marqueeItem}
          {marqueeItem}
        </div>
      </div>

      <div className="f-info">
        <div className="f-col left">
          <div className="f-title">{site.brand}&copy;</div>
          <div className="f-year">{site.year}</div>
          <img className="f-stamp" src="/assets/stamp.svg" alt="" />
          <div className="legal-w">
            <a className="f-li" href="#">
              Legal
            </a>
          </div>
        </div>
        <div className="f-col">
          <div className="f-block">
            {site.socials.map((s, i) => (
              <span key={s.label} style={{ display: "flex", gap: "0.6vw" }}>
                <a
                  className="f-li"
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.label}
                </a>
                {i < site.socials.length - 1 && (
                  <span className="f-li">·</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
