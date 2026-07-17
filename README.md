# Yuvenza · The Youth Club

The official website of **Yuvenza**, the student driven youth club of **Chennai Institute of Technology**.

> Igniting passion, creativity and unity. What we create, we contribute.

Yuvenza runs events, campaigns and community drives, and channels what it raises straight back into social causes: blind school visits, girl child home support, poverty and Braille awareness, environmental drives and youth mentoring.

**What this codebase is:** a complete fest platform, not just a brochure site.

- Public site with a full events showcase, per-event pages (image, details, rules, venue), live "97 / 120 slots left" counters streamed over websockets, and an admin-editable announcement banner.
- Visitor **Google sign-in restricted to `@citchennai.net`** (enforced in the database, not just the UI), a cart that survives the OAuth redirect, and **Razorpay checkout** with server-side signature verification.
- **Signed QR entry passes** (HMAC, unforgeable) with the attendee's name in the centre, **PDF ticket downloads**, and **confirmation emails** with the QR inline.
- An **admin panel** (`/admin`) with role-based access control: content, media, orders, refunds, comp passes, CSV exports, user/role management, encrypted payment credentials, and a **camera QR scanner with per-event gate check-in**.

---

## Tech stack & dependencies

| Layer | Technology | Used for |
| --- | --- | --- |
| Framework | **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict) | Everything; two root layouts split the public site and admin panel |
| Database / Auth / Storage | **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) | Postgres + RLS, Google OAuth + email/password auth, image storage, Realtime slot streaming |
| Payments | **Razorpay** (REST API, no SDK) | Order creation, signature verification, refunds, webhooks |
| Email | **Nodemailer + Gmail** on a Google Cloud Function | Confirmation emails (`google-cloud/email-function/`) |
| QR | `qrcode` (generate), `jsqr` (camera-decode fallback) | Entry passes + the admin gate scanner |
| PDF | `jspdf` (loaded on demand in the browser) | "Download ticket (PDF)" |
| Observability | `@vercel/analytics`, `@vercel/speed-insights`, `@vercel/otel` + `@opentelemetry/api` | Page analytics, Core Web Vitals, tracing, structured error logs |
| Testing / Lint | `vitest`, `eslint` 9 (flat config) | 67 unit tests over the money/security-critical pure logic |

Runtime requirement: **Node 18+** (developed on Node 22). One external CDN is used at payment time only: Razorpay's `checkout.js`.

---

## Quick start (zero configuration)

```bash
npm install
npm run dev        # http://localhost:3000
```

**The site runs with no env vars at all**: it serves the built-in fallback content (`lib/content/fallback.ts`), checkout runs in a clearly-labelled demo mode, and `/admin` shows a setup notice. Every feature below is opt-in via configuration.

All commands:

```bash
npm run dev        # dev server
npm run build      # production build (must stay green)
npm start          # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest
node scripts/email-demo.mjs   # render the email template -> HTML + PDF in ~/Downloads
```

> Only run one Next process at a time. A stray `next dev` and a `next start` will fight over `.next` and serve stale chunks (`ChunkLoadError`). If that happens: stop every Next process, `rm -rf .next`, rebuild, hard refresh.

---

## Every key you need

Copy the template and fill it in as you complete the setup steps:

```bash
cp .env.example .env.local
```

| Variable | Required for | Where to get it | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | correct OG/share URLs | you choose | `http://localhost:3000` locally, your domain in prod |
| `NEXT_PUBLIC_SUPABASE_URL` | everything backend | Supabase → Project Settings → API | safe to expose |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server reads | Supabase → Project Settings → **API Keys** | new-style `sb_publishable_…`; the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works. Safe to expose - RLS applies |
| `SUPABASE_SECRET_KEY` | admin features, payments, tickets | same page → **Secret keys** (`sb_secret_…`) | **SERVER-ONLY. Bypasses RLS. Never `NEXT_PUBLIC_`, never committed.** Legacy name `SUPABASE_SERVICE_ROLE_KEY` also works |
| `APP_ENCRYPTION_KEY` | Razorpay credential storage **and** QR pass signing | generate: `openssl rand -base64 32` | server-only, 32 bytes. Rotating it invalidates stored credentials (re-enter them) and re-issues passes automatically. **Must be identical on every deployment** |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | optional | Razorpay dashboard → API Keys | env **fallback** only - the admin panel stores keys encrypted in the DB and those win |
| `RAZORPAY_WEBHOOK_SECRET` | optional | you choose; set the same string in the Razorpay webhook | can also be stored via the admin panel |
| `EMAIL_FUNCTION_URL` / `EMAIL_FUNCTION_SECRET` | confirmation emails | printed when you deploy `google-cloud/email-function` | unset = emails silently skipped, nothing breaks |
| `DEPLOY_TARGET` | split hosting only | `site` or `admin` | leave unset locally; see "Two Vercel projects" below |

On **Vercel**: Project → Settings → Environment Variables (Production + Preview), then redeploy. `DEPLOY_TARGET` must be present at **build** time.

---

## Setup, step by step

### 1. Supabase (database, auth, storage) — ~10 minutes

1. Create a project at [supabase.com](https://supabase.com).
   *Pick a region near your users* (e.g. `ap-south-1` Mumbai for Chennai) - every admin action pays the round trip.
2. **Apply the schema**: SQL Editor → paste **`supabase/apply_all.sql`** → Run.
   (That file = migrations `0001`–`0007` + seed. On an existing database run only the numbered `supabase/migrations/000N_*.sql` files you haven't applied yet, in order.)
3. Copy the URL + publishable key + secret key into `.env.local`.
4. **Create your super admin**: Dashboard → Authentication → Users → Add user (email + password, auto-confirm), then in the SQL editor:
   ```sql
   select public.promote_to_super_admin('you@example.com');
   ```
5. Sign in at `/admin/login`. Invite everyone else from **Admin → Users** - no more SQL needed.
6. Recommended: Authentication → Sign In / Providers → **disable public email sign-ups** (admins are created from the panel; visitors use Google).

What the migrations create: 13 RLS-protected tables (content, events, orders, payments, per-event check-ins, live slot counters, encrypted secrets), a public `media` storage bucket (10 MB, images only), Realtime streaming on slot counters, and defense-in-depth triggers (publish permission, role-escalation guard, Google domain restriction, slot counting). Details: [docs/SETUP.md](docs/SETUP.md).

### 2. Google sign-in for visitors — ~10 minutes

1. [Google Cloud Console](https://console.cloud.google.com) → OAuth consent screen (External, publish) → Credentials → **OAuth client ID** (Web application):
   - Authorized JavaScript origins: `https://<your-domain>` and `http://localhost:3000`
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
2. Supabase Dashboard → Authentication → Sign In / Providers → **Google** → enable, paste Client ID + secret.
3. Done - the domain restriction (`@citchennai.net`) is already enforced by a database trigger and is editable in **Admin → Settings → Registration** (`*` allows any domain).

### 3. Razorpay payments — ~5 minutes

1. Razorpay dashboard → API Keys (start with `rzp_test_…`).
2. Enter key id + key secret in **Admin → Settings → Razorpay payments**. They are AES-256-GCM encrypted with `APP_ENCRYPTION_KEY` and never return to any browser.
3. Webhook: Razorpay dashboard → Webhooks → Add:
   - URL `https://<your-site>/api/webhooks/razorpay`
   - Events: `payment.captured`, `payment.failed`, `payment.refunded`, `order.paid`
   - Secret: any strong string → save the same value in the admin panel.
4. No keys configured = demo mode (registrations recorded, clearly labelled, no charge).

### 4. Confirmation emails — ~10 minutes, free tier

1. Gmail account → enable 2FA → create an **App password**.
2. Host the sender — pick ONE (full walkthrough in [google-cloud/email-function/README.md](google-cloud/email-function/README.md)):
   - **Render (recommended, no CLI):** render.com → **New → Blueprint** →
     select this repo → Apply. The `render.yaml` blueprint creates the free
     `yuvenza-email` web service; then set `GMAIL_USER` +
     `GMAIL_APP_PASSWORD` in its Environment tab and copy the generated
     `EMAIL_SHARED_SECRET`.
   - **Google Cloud Functions:**
     ```bash
     cd google-cloud/email-function
     gcloud functions deploy yuvenza-send-confirmation --gen2 --runtime=nodejs20 \
       --region=asia-south1 --source=. --entry-point=sendConfirmation \
       --trigger-http --allow-unauthenticated \
       --set-env-vars GMAIL_USER=...,FROM_NAME="Yuvenza",GMAIL_APP_PASSWORD=...,EMAIL_SHARED_SECRET=$(openssl rand -hex 32)
     ```
3. Put the service URL + the shared secret into `EMAIL_FUNCTION_URL` / `EMAIL_FUNCTION_SECRET` on Vercel and redeploy.
4. Preview the template anytime: `node scripts/email-demo.mjs` → HTML + PDF in `~/Downloads`.

Emails fire on every paid order (checkout, verify, webhook, mark-paid, comp) - idempotent, never double-sent, never blocking a payment. Gmail caps ~500 mails/day.

### 5. Vercel deployment

1. Import the repo, set the env vars above, deploy.
2. Dashboard toggles (one time): sidebar → **Analytics** → Enable; sidebar → **Speed Insights** → Enable; Team Settings → **Alerts** → add a 5xx error-anomaly rule.
3. Tracing and structured error logs work out of the box (`instrumentation.ts`); debug with `vercel logs --query '"yuvenza.request-error"' --since 1h`.

**Two Vercel projects (optional):** the admin panel is fully isolated and can be hosted separately. Import the same repo twice; set `DEPLOY_TARGET=site` on the public project (all `/admin` routes 404) and `DEPLOY_TARGET=admin` on the panel project (`/` redirects to `/admin`, e.g. at `admin.yourdomain.com`). Unset = combined (local dev).

---

## Routes

| Route | What it is |
| --- | --- |
| `/` | Home: hero, countdown, statement, pillars, work rail, events band, quotes, stats |
| `/events` | Events showcase: 4:3 images, live slots, details |
| `/events/[slug]` | Per-event page: about, numbered rules, venue, live slots, register CTA |
| `/registration` | Google sign-in, cart, checkout, "Your registrations" + QR passes + PDF |
| `/work`, `/work/[slug]` | Initiatives index + case study template |
| `/about`, `/legal` | About page; terms, refunds, privacy |
| `/auth/callback` | Google OAuth landing (domain re-check) |
| `/admin` | Admin panel (login required; sections below) |
| `/admin/checkin` | Phone-first gate scanner (needs only `checkin.verify`) |
| `/admin/payments/export`, `/admin/users/export` | Filter-aware CSV exports |
| `/api/checkout*` | Order creation / verify / cancel (rate limited) |
| `/api/ticket/[orderId]` | Signed QR pass issuing (paid orders, owner/admin only) |
| `/api/webhooks/razorpay` | Authoritative payment status (signature verified) |

## Admin panel sections

| Section | What you can do | Permission |
| --- | --- | --- |
| Dashboard | Counts, revenue, checked-in, recent orders | any role |
| Work / Case studies | CRUD, publish, covers, search/filters | `content.*` |
| Events | CRUD + schedule (date/time pickers), venue, capacity, image, details, rules | `content.*` |
| Site sections | Hero, statement, pillars, quotes, stats, fest/countdown, **announcement banner** | `content.edit` |
| Media library | Drag-drop uploads (progress, validation), alt text, folder filter | `media.*` |
| Orders & payments | Search/filters, live summary cards, CSV export, **mark paid / refund / comp passes / resend email** | `payments.view` / `payments.manage` |
| Gate check-in | Camera QR scanner, per-event check-in, undo, per-event counts | `checkin.verify` |
| Users | Search, role filter, invite, assign roles, deactivate, CSV export | `users.manage` |
| Roles & permissions | Create roles, toggle granular permissions | `roles.manage` (super admin) |
| Settings | Site info, contact email, registration domain + **close date**, encrypted Razorpay keys | `settings.manage` / `payments.manage` |

Default roles: `super_admin` (everything, incl. future permissions), `admin`, `editor`, `viewer` - full matrix in [docs/SETUP.md](docs/SETUP.md). Enforcement is layered: UI → server guards → Postgres RLS + triggers.

## Fest-day runbook

1. Create a **gate_staff** role (Roles & permissions → new role → only `checkin.verify`) and invite volunteers with it - they can scan but never see revenue or attendee exports.
2. Volunteers open **`/admin/checkin`** on their phones, pick their gate's event, tap "Open camera scanner". Green beep = in, amber = already scanned at this event (re-use warning + undo button), low buzz = invalid/not paid/not registered for this gate.
3. Front desk (someone with `payments.manage`): **Mark paid** for verified-but-stuck payments, **comp passes** for judges/guests, **Refund** for cancellations (real Razorpay refund; slot released automatically).
4. Announcements ("gates delayed to 10 AM"): Admin → Site sections → Announcement banner - shows on every public page instantly.
5. Attendee lists: Orders & payments → filter by event → **Export CSV**.

---

## Project structure

```
app/
  (site)/            public site (own root layout: webflow.css + globals.css + brand fonts)
    page.tsx  events/  events/[slug]/  registration/  work/  about/  legal/
    opengraph-image.tsx   [...rest]/ (global 404)
  (admin)/           admin panel (own root layout: ONLY admin.css, system fonts)
    admin/(panel)/   dashboard, work, events, content, media, payments, checkin, users, roles, settings
    admin/actions/   server actions (auth, content, media, payments, tickets, users, roles, settings)
    admin/login/  admin/not-configured/
  api/               checkout, ticket, webhook route handlers
  auth/callback/     Google OAuth landing
components/          public components + components/admin/* (scanner, uploader, tables…)
lib/
  content/           types, Supabase queries, static fallback (mirrors seed.sql)
  supabase/          browser/server/service clients, DB types, pagination helper
  rbac/              permission catalog + server guards (30s identity cache; RLS is the anchor)
  razorpay/          credentials (encrypted-at-rest), orders, refunds, signature verification
  events/            clash + capacity rules (shared by UI and API - never fork)
  email/  security/  hooks/  ticket.ts  checkout.ts  csv.ts  rateLimit.ts  env.ts
supabase/
  migrations/        0001..0007 (schema, RLS, triggers, storage, realtime)
  seed.sql  apply_all.sql
google-cloud/email-function/   Nodemailer + Gmail Cloud Function (own README)
instrumentation.ts   tracing + structured production error logs
middleware.ts        /admin session guard + DEPLOY_TARGET routing
tests/               vitest (crypto, tickets, RBAC, checkout, clash, capacity, domain)
docs/SETUP.md        the full operator manual
docs/EMAIL.md        confirmation emails on Render, step by step
```

`CLAUDE.md` documents the architecture invariants for AI-assisted development.

---

## Security model (summary)

- **Money**: totals recomputed server-side; amounts in paise in the DB; Razorpay signatures verified with a timing-safe HMAC; webhook signature-checked and idempotent.
- **Tickets**: QR payloads are server-signed (key derived from `APP_ENCRYPTION_KEY`); the browser never constructs one; verification + check-in are atomic.
- **Secrets**: Razorpay credentials AES-256-GCM encrypted in a table with RLS on and **no** policies (service-role only).
- **RBAC**: every page/action/route checks permissions server-side, and Postgres RLS + triggers re-check independently - hiding a button is never the only defence.
- **Visitors vs admins**: Google sign-ups get no admin role and are bounced from `/admin`; the domain restriction is a database trigger, not a UI hint.
- **Abuse**: per-IP rate limits on checkout/verify/ticket APIs; search inputs sanitized against filter-syntax injection; CSV exports guarded against formula injection.

## Editing content & conventions

- All content is editable at `/admin` (see table above). Without Supabase the site renders `lib/content/fallback.ts` - keep it in sync with `supabase/seed.sql`.
- **No en/em dashes in public copy** - commas, full stops or `·`.
- Accent letters in display headings: write `*x*` (`.f-span`) or `*_x*` (spaced) in admin-edited text; in JSX use `<span className="f-span">`.

## Design system

Ink `#1D1D1B` on paper `#CDC6BE`. Display type **Canopee**, body **Editorial New**, numerals/accents **Domaine Display**, wordmark **UnifrakturMaguntia**. Fluid `clamp()`/`vw` sizing, hairline rules, stamp + ripped paper motifs. Public CSS lives in `app/globals.css` (namespaced blocks: `.ho-` home, `.evx-` events showcase, `.evd-` event detail, `.ev-` registration, `.wk-`/`.cs-` work, `.ab-` about); the admin panel uses only `app/(admin)/admin.css` (`adm-` prefix, system fonts).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `/admin` says "not configured" | Supabase env vars missing - check `.env.local`, restart dev server |
| Sign-in with Google fails instantly | Provider not enabled in Supabase, or redirect URI mismatch in Google Cloud |
| "Only @citchennai.net accounts can register" | Working as intended; change the domain in Admin → Settings → Registration |
| Checkout says demo mode | No Razorpay keys in Admin → Settings (or env) |
| No confirmation emails | `EMAIL_FUNCTION_URL`/`SECRET` unset, or check the Cloud Function logs; use "Resend email" per order |
| QR pass won't load | Order not paid yet, or `APP_ENCRYPTION_KEY` missing/different on this deployment |
| Live slots not updating | Migration `0004` not applied (it adds the Realtime publication) |
| Admin slow | Move the Supabase project to a nearby region; the identity guard is already latency-tuned |
| `ChunkLoadError` locally | Two Next processes fought over `.next` - kill both, `rm -rf .next`, rebuild |

## Before going live

- [ ] Apply all migrations (`supabase/apply_all.sql` fresh, or `0002`–`0007` on the existing DB) and promote your super admin.
- [ ] Set every env var on Vercel (table above) - same `APP_ENCRYPTION_KEY` everywhere.
- [ ] Enable the Google provider; add your production domain to the Google OAuth client.
- [ ] Enter live Razorpay keys in Admin → Settings; point the webhook at production; do one real ₹1 test end-to-end (pay → email → QR → scan → refund).
- [ ] Deploy the email function and set its env vars.
- [ ] Enable Analytics + Speed Insights; add a 5xx alert rule.
- [ ] Set the registration close date, venues, capacities, images and rules per event.
- [ ] Create the gate_staff role and brief volunteers on `/admin/checkin`.
- [ ] Upload real photography via Admin → Media.
- [ ] Verify Supabase backups/PITR are enabled for fest week.
- [ ] Confirm licensing for the bundled typefaces (see Credits).

---

## Credits and third party assets

This site is built on top of a purchased/downloaded Webflow paper portfolio template. All Yuvenza copy, content, page layouts and the components under `components/` and `lib/` are our own work, but the following are not, and their licences still apply:

- `app/webflow.css`, the base stylesheet and layout classes inherited from the template.
- `public/vendor/paper-curtain.mjs` and its `ogl` dependency, a third party WebGL module. It is currently loaded but not relied on for any visible effect.
- `public/vendor/gsap.min.js` and `public/vendor/butter-slider.js`.
- The typefaces in `public/fonts/`: **Canopee**, **Editorial New** and **Domaine Display** are commercial fonts. Confirm you hold a webfont licence for each before shipping this publicly. UnifrakturMaguntia is available under the SIL Open Font License.

Please keep this section intact. It is what tells the next maintainer which parts of the repository we are not free to relicense.
