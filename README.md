# YUVENZA26

A **Next.js + TypeScript** "paper portfolio" — a fluid, editorial single-page
studio site built with a warm-paper design system, high-contrast serif display
type, smooth scrolling and scroll-triggered motion.

It recreates the look, layout and interaction language of a Webflow "paper
portfolio" template as a clean, component-driven Next.js app. **All copy and
imagery here are original placeholders** — the brand, project blurbs,
testimonials and case-study art are generated template content meant to be
swapped for your own.

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Lenis** — smooth scrolling
- **GSAP + ScrollTrigger** — scroll-reveal & motion
- **next/font** — Fraunces (display serif), Space Grotesk (grotesque),
  Pirata One (blackletter numerals)
- Pure CSS design system in `globals.css` — everything sized in `vw` so the
  layout scales 1:1 across widths, plus a full mobile/tablet breakpoint

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the build
```

## Project structure

```
src/
  app/
    layout.tsx        # fonts + metadata
    page.tsx          # composes the page
    globals.css       # the entire design system
  components/
    SmoothScroll.tsx  # Lenis + GSAP ticker
    Nav.tsx           # sticky nav + fullscreen menu overlay
    IndexGallery.tsx  # draggable horizontal project rail
    ProjectCard.tsx
    Hero.tsx          # brand headline, intro, roles, stamp, "upcoming"
    Awards.tsx        # awards counter row
    Artisan.tsx       # "the pixel perfect artisan" display section
    Testimonials.tsx  # draggable testimonial cards
    Footer.tsx        # marquee + info bar
    Reveal.tsx        # reusable scroll-reveal wrapper
    Rotate.tsx        # landscape-rotate notice
  data/
    site.ts           # brand, bio, socials, awards  ← edit me
    projects.ts       # project entries              ← edit me
    testimonials.ts   # testimonials                 ← edit me
  hooks/
    useDragScroll.ts  # pointer/wheel drag-to-scroll
public/assets/         # generated placeholder SVG art ← replace with your own
```

## Making it yours

1. **Content** — edit `src/data/site.ts`, `projects.ts`, `testimonials.ts`.
2. **Imagery** — replace the SVGs in `public/assets/` (project thumbnails,
   avatars, logo, stamp) with your own. Keep the same file names, or update the
   paths in the data files / components.
3. **Type & color** — tweak the CSS custom properties at the top of
   `globals.css` (`--paper`, `--ink`, `--rust`, …) and the font choices in
   `layout.tsx`.

## License / attribution

The design language is inspired by a well-known Webflow "paper portfolio"
template. This repository ships **only original placeholder text and
procedurally-generated placeholder art** — it does not include the original
site's copyrighted copy, photography or fonts. Provide your own licensed fonts
and assets before using this commercially.
