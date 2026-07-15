# Yuvenza · The Youth Club

The official website of **Yuvenza**, the student driven youth club of **Chennai Institute of Technology**.

> Igniting passion, creativity and unity. What we create, we contribute.

Yuvenza runs events, campaigns and community drives, and channels what it raises straight back into social causes: blind school visits, girl child home support, poverty and Braille awareness, environmental drives and youth mentoring.

Built with **Next.js (App Router)**, **React 19** and **TypeScript**, backed by
**Supabase** (database, auth, storage, RBAC), **Razorpay** (payments) and
**Vercel Analytics / Speed Insights**. Content is managed from a built-in
admin panel at `/admin`.

---

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (prerenders every route)
npm start          # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest (crypto, payment verification, RBAC, checkout)
```

Node 18+ (developed on Node 22).

**The site runs with zero configuration** - without env vars it serves the
built-in fallback content, checkout runs in demo mode and `/admin` shows a
setup notice. To enable the database, admin panel and payments, follow
**[docs/SETUP.md](docs/SETUP.md)** (Supabase migration/seed, environment
variables, Razorpay keys, Vercel Analytics).

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
| `/admin`         | Admin panel   | Content, media, orders, users, roles, settings (auth required) |
| `/api/checkout*` | Payments API  | Order creation, signature verification, cancellation           |
| `/api/webhooks/razorpay` | Webhook | Authoritative Razorpay payment status updates              |

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
  Countdown.tsx     live countdown (target date editable in the admin panel)
  Placeholder.tsx   labelled image placeholder
  PageReveal.tsx    reveals each page on mount, clears any scroll lock
  BodyClass.tsx     sets the per page body class
  SiteScripts.tsx   loads GSAP, butter-slider, the paper-curtain module, mobile --vh fix

app/admin/           admin panel (login, dashboard, content/media/orders/users/roles/settings)
app/api/             checkout + Razorpay webhook route handlers
middleware.ts        /admin session guard

lib/
  content/           public data layer: types, Supabase queries, static fallback
  supabase/          browser / server / service-role clients + DB types
  rbac/              permission catalog, default roles, server guards
  razorpay/          credential resolution, order creation, signature verification
  security/          AES-256-GCM secret encryption
  checkout.ts        server-side checkout validation & totals (unit-tested)
  media.ts           media bucket constants
  env.ts             every process.env read
  data.ts            image path constants

supabase/
  migrations/        full schema: tables, RLS policies, triggers, storage bucket
  seed.sql           permission catalog, default roles, current site content

tests/               vitest suites (crypto, payment verification, RBAC, checkout)

public/
  fonts/            Canopee, Editorial New, Domaine Display, UnifrakturMaguntia
  images/           stamp, arrow, textures and UI marks
  vendor/           gsap, butter-slider, paper-curtain module
```

---

## Editing content

Content is managed from the **admin panel at `/admin`** (once Supabase is
configured - see [docs/SETUP.md](docs/SETUP.md)):

- **Initiatives** (`/work`, case studies, home rail): Admin → Work.
- **Fest entries** (`/registration`, home events band): Admin → Events. Fees are INR; `0` renders as "Free".
- **Page sections** (hero, statement, pillars, testimonials, stats, join CTA): Admin → Site sections.
- **Countdown target & fest dates**: Admin → Site sections → Fest & countdown.
- **Images**: Admin → Media library (or upload directly from the work/event editors).

Without Supabase, the site renders the static fallback content in
`lib/content/fallback.ts` (kept in sync with `supabase/seed.sql`).

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
- **Photography defaults to placeholders.** `Placeholder.tsx` renders a labelled box wherever no image has been uploaded yet; covers uploaded through the admin panel replace them automatically.
- **Checkout is Razorpay-backed.** Orders are created and signatures verified server-side (`/api/checkout*`); with no credentials configured it falls back to a clearly-labelled demo mode.

---

## Before going live

See the full checklist in [docs/SETUP.md](docs/SETUP.md). Highlights:

- [ ] Apply the Supabase migration + seed and promote your super admin.
- [ ] Set all env vars on Vercel (`.env.example` lists them).
- [ ] Enter Razorpay keys in Admin → Settings and configure the webhook.
- [ ] Enable Analytics + Speed Insights in the Vercel dashboard.
- [ ] Upload real Yuvenza photography via Admin → Media.
- [ ] Confirm licensing for the bundled typefaces (see Credits) before deploying publicly.
- [ ] Add a real contact address to `/legal` if you would rather not route enquiries through Instagram.

---

## Credits and third party assets

This site is built on top of a purchased/downloaded Webflow paper portfolio template. All Yuvenza copy, content, page layouts and the components under `components/` and `lib/` are our own work, but the following are not, and their licences still apply:

- `app/webflow.css`, the base stylesheet and layout classes inherited from the template.
- `public/vendor/paper-curtain.mjs` and its `ogl` dependency, a third party WebGL module. It is currently loaded but not relied on for any visible effect.
- `public/vendor/gsap.min.js` and `public/vendor/butter-slider.js`.
- The typefaces in `public/fonts/`: **Canopee**, **Editorial New** and **Domaine Display** are commercial fonts. Confirm you hold a webfont licence for each before shipping this publicly. UnifrakturMaguntia is available under the SIL Open Font License.

Please keep this section intact. It is what tells the next maintainer which parts of the repository we are not free to relicense.
