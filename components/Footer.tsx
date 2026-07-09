import { AVATARS } from "@/lib/data";

const JOIN_LINK = "https://www.instagram.com/yuvenza_cit/";

function MarqueeContent() {
  return (
    <div className="marquee-content">
      <h4 className="f-news">Let&#x27;s create change together</h4>
      <a
        target="_blank"
        aria-label="Yuvenza Join Us"
        rel="noopener"
        draggable={false}
        href={JOIN_LINK}
        className="marquee-link w-inline-block"
      >
        <div className="marquee-text">Join Us</div>
      </a>
    </div>
  );
}

const socials = [
  {
    href: "https://www.instagram.com/yuvenza_cit/",
    label: "instagram",
    node: (
      <>
        insta<span className="f-span">g</span>ram
      </>
    ),
  },
  {
    href: "https://www.linkedin.com/company/yuvenza-cit/",
    label: "linkedin",
    node: (
      <>
        linke<span className="f-span">d</span>in
      </>
    ),
  },
];

export default function Footer() {
  return (
    <div className="footer">
      <div className="marquee">
        <div className="marquee--inner">
          <MarqueeContent />
          <MarqueeContent />
          <MarqueeContent />
        </div>
      </div>
      <div className="f-info">
        <div className="f-col left">
          <div className="f-title">Yuvenza©</div>
          <div className="f-year">2021</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={AVATARS.stamp} loading="lazy" alt="" className="f-stamp" />
          <div className="legal-w">
            <a
              data-color="#1D1D1B"
              aria-label="yuvenza-legal"
              draggable={false}
              rel="noopener"
              href="/legal"
              target="_blank"
              className="f-link new-tab"
            >
              Legal
            </a>
          </div>
        </div>
        <div className="f-col">
          <div className="f-block w-clearfix">
            {socials.map((s, i) => (
              <span key={s.label} style={{ display: "contents" }}>
                <a
                  draggable={false}
                  aria-label={s.label}
                  rel="noopener"
                  target="_blank"
                  href={s.href}
                  className="f-li new-tab f"
                >
                  {s.node}
                </a>
                {i < socials.length - 1 && <div className="f-li ci f">·</div>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
