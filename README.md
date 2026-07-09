# Yuvenza · The Youth Club

The official website of **Yuvenza**, the student driven youth club of **Chennai Institute of Technology**.

> Igniting passion, creativity and unity. What we create, we contribute.

Yuvenza runs events, campaigns and community drives, and channels what it raises straight back into social causes: blind school visits, girl child home support, poverty and Braille awareness, environmental drives and youth mentoring.

Built with **Next.js (App Router)**, **React 19** and **TypeScript**.

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (prerenders every route)
npm start        # serve the production build
```

Node 18+ (developed on Node 22).

> Only run one Next process at a time. A stray `next dev` and a `next start` will fight over `.next` and serve stale chunks (you will see `ChunkLoadError` in the browser). If that happens, stop every Next process, delete `.next`, rebuild, and hard refresh the tab.

---

## Routes

| Route            | Page          | Notes                                                        |
| ---------------- | ------------- | ------------------------------------------------------------ |
| `/`              | Home          | Hero, countdown, statement, pillars, work rail, events, quotes, stats |
| `/work`          | Work index    | Editorial list of every initiative, hover reveals a thumbnail |
| `/work/[slug]`   | Case study    | One shared template, statically generated for all 8 initiatives |
| `/registration`  | Registration  | Browse fest entries, add to a persistent cart, checkout       |
| `/about`         | About         | Mission, pillars, impact stats, what we do, join CTA           |
| `/legal`         | Legal         | Terms, privacy and registration basics                        |

---

## Project structure

```
app/
  layout.tsx           root layout, metadata, inline SVG favicon
  page.tsx             home
  work/page.tsx        work index
  work/[slug]/page.tsx dynamic case study route (generateStaticParams)
  registration/page.tsx
  about/page.tsx
  legal/page.tsx
  globals.css          design system + every page's styles
  webflow.css          base stylesheet and @font-face declarations

components/
  AppShell.tsx      shared frame: body class, #app, nav, footer, page reveal
  Nav.tsx           fixed nav + fullscreen menu (paper curtain, hamburger to X)
  Footer.tsx        marquee + socials
  CaseStudy.tsx     the single template every /work/[slug] page renders through
  EventsClient.tsx  registration UI: entries, cart bar, checkout modal
  Countdown.tsx     live countdown to August 11
  Placeholder.tsx   labelled image placeholder
  PageReveal.tsx    reveals each page on mount, clears any scroll lock
  BodyClass.tsx     sets the per page body class
  SiteScripts.tsx   loads GSAP, butter-slider, the paper-curtain module, mobile --vh fix

lib/
  caseStudies.ts    the 8 initiatives (title, category, year, description, story)
  events.ts         the 8 fest entries (category, date, price, slots)
  data.ts           image path constants

public/
  fonts/            Canopee, Editorial New, Domaine Display, UnifrakturMaguntia
  images/           stamp, arrow, textures and UI marks
  vendor/           gsap, butter-slider, paper-curtain module
```

---

## Editing content

Almost all copy lives in two typed files, so no JSX editing is needed for routine updates.

- **Initiatives** (`/work` and every case study): `lib/caseStudies.ts`. Add an object to `CASE_STUDIES` and the work index, the case study page, the home rail and the previous/next pager all pick it up automatically. Each entry supports `title`, `category`, `year`, `desc`, an optional `client`, an optional long form `story` and an optional `liveSite`.
- **Fest entries** (`/registration` and the home events band): `lib/events.ts`. Prices are plain numbers in INR (`0` renders as "Free").
- **Countdown target**: `components/Countdown.tsx` counts down to the next August 11. Change the month and day in `computeTarget()`.

### Writing conventions

- **No en dashes or em dashes anywhere.** Use commas, full stops, parentheses or a middot (`·`). This is enforced across the whole site.
- Accent letters inside headings use the `.f-span` class, which swaps that single glyph to Domaine Display. For example: `W<span className="f-span space">o</span>rk`.

---

## Design system

A tactile, editorial "paper" language.

| Token       | Value                                                     |
| ----------- | --------------------------------------------------------- |
| Ink         | `#1D1D1B`                                                  |
| Paper       | `#CDC6BE`                                                  |
| Sage accent | `#96B59F` (the hand drawn doodle)                          |
| Display     | Canopee (huge uppercase headings, tight tracking)          |
| Body        | Editorial New (light serif)                                |
| Accents     | Domaine Display (numerals and `.f-span` swash letters)     |
| Wordmark    | UnifrakturMaguntia ("The Youth Club")                      |

**Motifs:** drop caps set in ink, a rubber stamp, a hand drawn ellipse that strokes on hover, ripped paper reveals on case study covers, hairline rules, dashed borders and a paper grain multiply layer.

**CSS namespaces** in `globals.css`, one self contained block per surface:

`.ho-` home · `.wk-` work index · `.cs-` case study · `.ab-` about · `.ev-` registration · `.hm-` home bands · `.cd` countdown · `.img-ph` placeholders

Display type uses `clamp()` so headings scale fluidly and never overflow or clip. A responsive safety net (`overflow-x: clip` plus `overflow-wrap`) guarantees no horizontal scrolling on small screens.

---

## Behaviour notes

- **Scrolling is native.** The original smooth scroll library was removed because it fought the viewport based layout and left pages unscrollable after client side navigation. `overflow-x: clip` is used rather than `hidden`, because `hidden` forces the other axis to `auto` and turns the element into a scroll container.
- **The nav is always fixed.** Anything that sets `transform`, `perspective` or `will-change` on an ancestor would make a fixed child scroll away, so `#app` deliberately sets none of them.
- **The menu is a paper curtain.** It sweeps in on open and back out on close with the same easing, the links stagger in, and the hamburger morphs into an X. It is pure CSS, driven by an `is-open` class, so it does not depend on WebGL.
- **All photography is a placeholder.** `Placeholder.tsx` renders a labelled box wherever a real image belongs. Drop real photography in and replace those components.
- **Checkout is a frontend demo.** `EventsClient.tsx` collects a registration and shows a confirmation, but takes no payment. Wire a real provider into `handlePay` before going live.

---

## Before going live

- [ ] Replace every `Placeholder` with real Yuvenza photography.
- [ ] Connect a payment provider in `EventsClient.tsx` (`handlePay`) and confirm the fee and refund copy in `/legal`.
- [ ] Confirm licensing for the bundled typefaces (see Credits) before deploying publicly.
- [ ] Set `metadataBase` in `app/layout.tsx` so Open Graph and Twitter image URLs resolve absolutely.
- [ ] Add a real contact address to `/legal` if you would rather not route enquiries through Instagram.
- [ ] Optional cleanup: `components/Item.tsx` and the Locomotive files in `public/vendor/` are no longer referenced.

---

## Credits and third party assets

This site is built on top of a purchased/downloaded Webflow paper portfolio template. All Yuvenza copy, content, page layouts and the components under `components/` and `lib/` are our own work, but the following are not, and their licences still apply:

- `app/webflow.css`, the base stylesheet and layout classes inherited from the template.
- `public/vendor/paper-curtain.mjs` and its `ogl` dependency, a third party WebGL module. It is currently loaded but not relied on for any visible effect.
- `public/vendor/gsap.min.js` and `public/vendor/butter-slider.js`.
- The typefaces in `public/fonts/`: **Canopee**, **Editorial New** and **Domaine Display** are commercial fonts. Confirm you hold a webfont licence for each before shipping this publicly. UnifrakturMaguntia is available under the SIL Open Font License.

Please keep this section intact. It is what tells the next maintainer which parts of the repository we are not free to relicense.
