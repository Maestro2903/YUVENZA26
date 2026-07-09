"use client";

import { useEffect } from "react";

/**
 * Reveals the current page's `#app` on mount.
 *
 * Inner pages (`.beige` / `.work-case`) start at `opacity: 0` via CSS and fade
 * in once `.appear` is added. The library boot in SiteScripts only runs once
 * for the persistent root layout, so on client-side navigation a freshly
 * mounted `#app` would never get `.appear` and the page would render blank.
 * This component runs on every page mount, so the reveal always fires, and it
 * also clears any lingering scroll lock so scrolling works everywhere.
 */
export default function PageReveal() {
  useEffect(() => {
    const app = document.getElementById("app");
    // reveal on the next frame so the opacity transition actually plays
    const id = requestAnimationFrame(() => {
      app?.classList.add("appear");
      // reveal any inline opacity:0 content (Webflow IX2 intro-hidden nodes)
      app?.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
        if (el.style.opacity === "0") {
          el.style.transition = "opacity 1s ease-out";
          el.style.opacity = "1";
        }
      });
    });
    // never leave the document scroll-locked
    document.documentElement.classList.remove("no-scroll");
    return () => cancelAnimationFrame(id);
  }, []);

  return null;
}
