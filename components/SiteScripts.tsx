"use client";

import { useEffect } from "react";

/**
 * Loads the interaction libraries the site uses (GSAP for the intro reveal,
 * butter-slider for the draggable work rail, and the WebGL paper-curtain
 * module) - all self-hosted from /vendor - plus the mobile `--vh` fix.
 *
 * Scrolling is native: the original Locomotive smooth-scroll hijack was
 * removed because it fought the vw-based layout and left pages unscrollable
 * after client-side navigation. Everything is wrapped defensively so a single
 * library hiccup degrades gracefully to the (correct) static layout.
 */

const GSAP_JS = "/vendor/gsap.min.js";
const BUTTER_JS = "/vendor/butter-slider.js";

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.id = id;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/** The paper-curtain ES module (self-hosted from /vendor, with its ogl deps mirrored locally). */
const PAPER_CURTAIN_MODULE = /* js */ `
import PaperCurtainEffect from "/vendor/paper-curtain.mjs";

const isMobile = window.innerWidth <= 991;
const containerEl = document.querySelector('[data-scroll-container]');
const isHorizontal = containerEl ? containerEl.dataset.scrollDirection === 'horizontal' : false;

const aboveCanvas = document.querySelector("#above-canvas");
const textureUrl = "/images/paper-texture.jpg";
const opts = {
  color: "#1D1D1B",
  background: "#000000",
  backgroundOpacity: 0,
  ease: "power3.inOut",
  duration: 2,
  texture: textureUrl,
  amplitude: 0.25,
  rippedFrequency: 3.5,
  rippedAmplitude: 0.05,
  curveFrequency: 1,
  curveAmplitude: 0.1,
  rippedDelta: 1,
  rippedHeight: 0.07,
  horizontal: isHorizontal && !isMobile,
};

try {
  if (aboveCanvas) {
    window.paperCurtainEffect = new PaperCurtainEffect(aboveCanvas, opts);
  }
} catch (e) { console.warn('paper-curtain init failed', e); }

window.dispatchEvent(new Event('paper-curtain-ready'));
`;

export default function SiteScripts() {
  useEffect(() => {
    // --- 100vh fix on mobile ---
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVh();
    window.addEventListener("resize", setVh);

    // --- pathname class (matches original setPathnameClass) ---
    const match = /(?<=work\/).*$/.exec(window.location.pathname);
    if (match) document.body.classList.add(match[0].replace(/\/$/, ""));

    // --- intro mode: inner (beige / work-case) pages start at opacity:0 and
    //     fade in via `.appear`; the home page does the scale/spin reveal. ---
    const appEl = document.querySelector<HTMLElement>("#app");
    const introMode = appEl?.getAttribute("data-intro") || "spin";
    if (introMode !== "spin") {
      // reveal on next frame so the opacity transition actually plays
      requestAnimationFrame(() => {
        appEl?.classList.add("appear");
        // Reveal any Webflow IX2 intro-hidden content (inline opacity:0 that the
        // interactions engine would normally fade in - e.g. the horizontal
        // work gallery's `.page content` root).
        appEl?.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
          if (el.style.opacity === "0") {
            el.style.transition = "opacity 1s ease-out";
            el.style.opacity = "1";
          }
        });
      });
    }

    /** Signature intro: the whole #app scales up from 0.4 and un-spins 720° into place. */
    function runIntro() {
      const gsap = (window as any).gsap;
      const app = document.querySelector<HTMLElement>("#app");
      if (!gsap || !app) return;
      gsap.set(app, {
        transformOrigin: "50% 10%",
        y: "25vw",
        scale: 0.4,
        rotation: 720,
        force3D: true,
      });
      gsap.to(app, {
        y: "0vw",
        scale: 1,
        rotation: 0,
        duration: 2,
        ease: "power3.inOut",
        onComplete: () => {
          // Release the element so native scrolling isn't offset by the transform.
          try {
            gsap.set(app, { clearProps: "transform" });
          } catch {}
        },
      });
    }

    async function boot() {
      // GSAP first - it drives the intro reveal and the menu fades.
      try {
        await loadScript(GSAP_JS, "gsap-lib");
      } catch (e) {
        console.warn(e);
      }

      // Kick off the home scale/spin reveal (inner pages already fade in above).
      if (introMode === "spin") runIntro();

      // ---- butter-slider (draggable work rail on the home header) ----
      try {
        await loadScript(BUTTER_JS, "butter-lib");
        const bs = (window as any).butterSlider;
        if (bs && typeof bs.autoInit === "function") {
          const sliders = bs.autoInit();
          if (sliders && sliders[0]) {
            sliders[0].smoothAmount = 1;
            sliders[0].setRelativePosition(
              window.innerWidth * (0.62 / sliders[0].dragSpeed)
            );
            sliders[0].smoothAmount = 0.15;
          }
        }
      } catch (e) {
        console.warn("butter-slider unavailable:", e);
      }

      // ---- WebGL paper curtain (menu / page transitions) ----
      try {
        if (!document.getElementById("paper-curtain-module")) {
          const mod = document.createElement("script");
          mod.type = "module";
          mod.id = "paper-curtain-module";
          mod.textContent = PAPER_CURTAIN_MODULE;
          document.body.appendChild(mod);
        }
      } catch (e) {
        console.warn("paper-curtain unavailable:", e);
      }

      // ---- Native scrolling ----
      // The Locomotive smooth-scroll hijack was removed: it fought the vw-based
      // layout and left inner pages unscrollable (and sometimes blank) after
      // client-side navigation. Native scrolling is reliable on every page and
      // device; PageReveal clears any residual lock and reveals each page.
      document.documentElement.classList.remove("no-scroll");
    }

    boot();

    return () => {
      window.removeEventListener("resize", setVh);
    };
  }, []);

  return null;
}
