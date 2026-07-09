"use client";

import { useCallback, useRef, useState } from "react";

const menuLinks = [
  { href: "/", label: "Yuvenza Home", node: <>Index</>, active: "index" },
  {
    href: "/work",
    label: "Yuvenza Work",
    node: (
      <>
        <span className="span">W</span>
        <span className="f-span space">o</span>rk
      </>
    ),
    active: "work",
  },
  {
    href: "/registration",
    label: "Yuvenza Register",
    node: (
      <>
        Regi<span className="f-span space">s</span>ter
      </>
    ),
    active: "registration",
  },
  {
    href: "/about",
    label: "Yuvenza About",
    node: (
      <>
        Ab<span className="f-span space">o</span>ut
      </>
    ),
    active: "about",
  },
];

const menuSocials = [
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

export default function Nav({
  current = "index",
}: {
  current?: "index" | "work" | "about" | "registration";
}) {
  const [open, setOpen] = useState(false);
  const transitioning = useRef(false);

  const toggleMenu = useCallback(() => {
    if (transitioning.current) return;
    const curtain = (window as any).paperCurtainEffect;
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        curtain?.in?.();
      } else {
        curtain?.out?.();
      }
      return next;
    });
  }, []);

  return (
    <nav
      data-scroll-target="#app"
      data-scroll="true"
      data-scroll-sticky="true"
      data-w-id="af8143f5-c4bd-7eb6-0bbf-06e371a2b306"
      className={`nav default${open ? " is-open" : ""}`}
    >
      <div className="gl-canvas w-embed">
        <canvas id="above-canvas" />
      </div>
      <div className="nav-inner">
        <div className="paper-background work" />
        <div aria-label="nav-link" rel="noopener" className="nav-block l">
          <div className="n-text">Chennai, India</div>
        </div>
        <a
          data-color="#1D1D1B"
          aria-label="The Youth Club Home"
          rel="noopener"
          href="/"
          className="nav-head w-inline-block w--current"
        >
          <div className="brand-text">The Youth Club</div>
        </a>
        <div className="nav-block r">
          <div className="nav-link" onClick={toggleMenu} role="button" tabIndex={0}>
            <div className="nav-lines">
              <div className="nav-line up" />
              <div className="nav-line bottom" />
            </div>
          </div>
        </div>

        <div className="menu" aria-hidden={!open}>
          <div className="menu-w">
            {menuLinks.map((l) => (
              <a
                key={l.active}
                draggable={false}
                aria-label={l.label}
                data-color="#cdc6be"
                rel="noopener"
                href={l.href}
                className={`menu-link m${menuLinks.indexOf(l) + 1} w-inline-block${
                  l.active === current ? " w--current" : ""
                }`}
              >
                <h1 className={`menu-title m${menuLinks.indexOf(l) + 1}`}>{l.node}</h1>
                <div className={`m-active ${l.active}`} />
              </a>
            ))}
          </div>
          <div className="f-block li w-clearfix">
            {menuSocials.map((s, i) => (
              <span key={s.label} style={{ display: "contents" }}>
                <a
                  draggable={false}
                  aria-label={`Yuvenza ${s.label}`}
                  rel="noopener"
                  target="_blank"
                  href={s.href}
                  className="f-li new-tab w"
                >
                  {s.node}
                </a>
                {i < menuSocials.length - 1 && <div className="f-li ci w">·</div>}
              </span>
            ))}
          </div>
        </div>

        <div className="menu-line">
          <div className="menu-face" />
          <div className="menu-side" />
        </div>
      </div>
    </nav>
  );
}
