"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

export default function Nav({
  current = "index",
  instagramUrl = "https://www.instagram.com/yuvenza_cit/",
  linkedinUrl = "https://www.linkedin.com/company/yuvenza-cit/",
  locationLabel = "Chennai, India",
}: {
  current?: "index" | "work" | "about" | "registration";
  instagramUrl?: string;
  linkedinUrl?: string;
  locationLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const transitioning = useRef(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const menuSocials = [
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

  const toggleMenu = useCallback(() => {
    if (transitioning.current) return;
    const curtain = (window as { paperCurtainEffect?: { in?: () => void; out?: () => void } })
      .paperCurtainEffect;
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

  // Close the menu with Escape and hand focus back to the toggle.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        toggleMenu();
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, toggleMenu]);

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
        <div className="nav-block l">
          <div className="n-text">{locationLabel}</div>
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
          <button
            ref={toggleRef}
            type="button"
            className="nav-link"
            onClick={toggleMenu}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-menu"
          >
            <div className="nav-lines" aria-hidden="true">
              <div className="nav-line up" />
              <div className="nav-line bottom" />
            </div>
          </button>
        </div>

        <div className="menu" id="site-menu" aria-hidden={!open}>
          <div className="menu-w">
            {menuLinks.map((l) => (
              <a
                key={l.active}
                draggable={false}
                aria-label={l.label}
                data-color="#cdc6be"
                rel="noopener"
                href={l.href}
                tabIndex={open ? 0 : -1}
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
                  rel="noopener noreferrer"
                  target="_blank"
                  href={s.href}
                  tabIndex={open ? 0 : -1}
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
