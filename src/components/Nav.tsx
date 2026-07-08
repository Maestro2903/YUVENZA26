"use client";

import { useEffect, useState } from "react";
import { site } from "@/data/site";

const MENU = [
  { label: "Index", href: "#index" },
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  // lock scroll while the menu overlay is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <nav className={`nav ${open ? "open" : ""}`}>
      <div className="nav-inner">
        <div className="nav-block l">
          <div className="n-text">{site.location}</div>
        </div>

        <a href="#top" className="nav-head" aria-label={site.brand}>
          <img src="/assets/logo-light.svg" alt={site.brand} />
        </a>

        <div className="nav-block r">
          <button
            className="nav-link"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <div className="nav-lines">
              <div className="nav-line up" />
              <div className="nav-line bottom" />
            </div>
          </button>
        </div>
      </div>

      <div className={`menu ${open ? "open" : ""}`}>
        <div className="menu-w">
          {MENU.map((m, i) => (
            <a
              key={m.label}
              href={m.href}
              className={`menu-link m${i + 1}`}
              onClick={() => setOpen(false)}
            >
              <h2 className="menu-title">{m.label}</h2>
            </a>
          ))}
        </div>
        <div className="f-block">
          {site.socials.map((s, i) => (
            <span key={s.label} style={{ display: "flex", gap: "0.6vw" }}>
              <a
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="f-li"
                style={{ color: "var(--paper)" }}
              >
                {s.label}
              </a>
              {i < site.socials.length - 1 && (
                <span className="f-li" style={{ color: "var(--paper)" }}>
                  ·
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </nav>
  );
}
