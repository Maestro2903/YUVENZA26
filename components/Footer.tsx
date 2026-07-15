import { AVATARS } from "@/lib/data";

function MarqueeContent({ joinHref }: { joinHref: string }) {
  return (
    <div className="marquee-content">
      <h4 className="f-news">Let&#x27;s create change together</h4>
      <a
        target="_blank"
        aria-label="Yuvenza Join Us"
        rel="noopener noreferrer"
        draggable={false}
        href={joinHref}
        className="marquee-link w-inline-block"
      >
        <div className="marquee-text">Join Us</div>
      </a>
    </div>
  );
}

export default function Footer({
  instagramUrl = "https://www.instagram.com/yuvenza_cit/",
  linkedinUrl = "https://www.linkedin.com/company/yuvenza-cit/",
}: {
  instagramUrl?: string;
  linkedinUrl?: string;
}) {
  const socials = [
    {
      href: instagramUrl,
      label: "instagram",
      node: (
        <>
          insta<span className="f-span">g</span>ram
        </>
      ),
    },
    {
      href: linkedinUrl,
      label: "linkedin",
      node: (
        <>
          linke<span className="f-span">d</span>in
        </>
      ),
    },
  ];

  const year = new Date().getFullYear();

  return (
    <div className="footer">
      <div className="marquee">
        <div className="marquee--inner">
          <MarqueeContent joinHref={instagramUrl} />
          <MarqueeContent joinHref={instagramUrl} />
          <MarqueeContent joinHref={instagramUrl} />
        </div>
      </div>
      <div className="f-info">
        <div className="f-col left">
          <div className="f-title">Yuvenza©</div>
          <div className="f-year">{year}</div>
          { }
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
                  rel="noopener noreferrer"
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
