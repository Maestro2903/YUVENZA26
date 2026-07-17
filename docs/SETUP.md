# YUVENZA26 — Backend, Admin Panel & Payments Setup

The public site works with **zero configuration** (it falls back to built-in
content). Supabase powers the database, auth, storage, and RBAC; Razorpay
powers payments; Vercel Analytics/Speed Insights power measurement. This guide
takes you from a clean checkout to a fully configured deployment.

---

## 1. Environment variables

Copy the template and fill it in as you complete the steps below:

```bash
cp .env.example .env.local
```

| Variable | Where it's used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | metadataBase, OG URLs | e.g. `https://yuvenza.example.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | safe to expose; RLS applies |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | bypasses RLS — never `NEXT_PUBLIC_` |
| `APP_ENCRYPTION_KEY` | **server only** | 32 bytes base64/hex: `openssl rand -base64 32` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | server only, optional | fallback; admin-panel credentials take priority |
| `RAZORPAY_WEBHOOK_SECRET` | server only, optional | fallback for the webhook secret |

On **Vercel**: Project → Settings → Environment Variables. Set them for
Production and Preview. Redeploy after changes.

---

## 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema — either:
   - **SQL editor**: paste and run `supabase/migrations/0001_initial_schema.sql`,
     then `supabase/seed.sql`, or
   - **CLI**: `supabase link --project-ref <ref>` then `supabase db push`
     (runs migrations) and run the seed via
     `psql $DATABASE_URL -f supabase/seed.sql` or the SQL editor.
3. Copy the URL / anon key / service-role key into `.env.local`.

### What the migration creates

**Tables** (all with Row Level Security):

| Table | Purpose | RLS summary |
|---|---|---|
| `roles`, `permissions`, `role_permissions` | RBAC model | read: any signed-in user; write: `roles.manage` |
| `profiles` | one per auth user (role, active flag) | own row or `users.manage`; anti-escalation trigger |
| `case_studies` | /work content | public read of published; writes per `content.*` permissions |
| `events` | fest line-up + fees | same as case_studies |
| `site_content` | editable page sections (hero, fest, …) | public read; write: `content.edit` |
| `site_settings` | non-secret app settings | public read; write: `settings.manage` |
| `media` | media library metadata | public read; write: `media.upload` / `media.delete` |
| `orders`, `payments` | Razorpay order + payment trail | read: `payments.view`; written by the server (service role) |
| `app_secrets` | AES-256-GCM-encrypted credentials | **no policies → service role only** |

**Storage**: a public `media` bucket (10 MB limit, image MIME types only) with
policies requiring `media.upload` / `media.delete` for writes.

**Defense-in-depth triggers**: flipping `published` requires
`content.publish`; changing roles/active-status requires `users.manage`; only
a super admin can grant/revoke `super_admin` — enforced in Postgres even if
the app is bypassed.

### Bootstrap your super admin

1. Create your account: Supabase Dashboard → Authentication → Users →
   **Add user** (email + password, confirm email). New users automatically get
   a `viewer` profile.
2. Promote it (SQL editor):

```sql
select public.promote_to_super_admin('you@example.com');
```

3. Sign in at `/admin/login`. From there you can invite everyone else via
   **Admin → Users** — no more SQL needed.

> Recommended: disable public signups (Authentication → Providers → Email →
> disable "Enable sign ups") since admins are created from the panel.

---

## 3. Default roles & permissions

| Permission | super_admin | admin | editor | viewer |
|---|:-:|:-:|:-:|:-:|
| content.view | ✅ | ✅ | ✅ | ✅ |
| content.create | ✅ | ✅ | ✅ | — |
| content.edit | ✅ | ✅ | ✅ | — |
| content.delete | ✅ | ✅ | — | — |
| content.publish | ✅ | ✅ | — | — |
| media.view | ✅ | ✅ | ✅ | ✅ |
| media.upload | ✅ | ✅ | ✅ | — |
| media.delete | ✅ | ✅ | — | — |
| payments.view | ✅ | ✅ | — | ✅ |
| payments.manage | ✅ | — | — | — |
| users.manage | ✅ | ✅ | — | — |
| roles.manage | ✅ | — | — | — |
| settings.manage | ✅ | ✅ | — | — |

`super_admin` implicitly holds **every** permission (including future ones)
and is the only role that can manage roles/permissions or payment credentials
by default. Super admins can create custom roles and toggle any permission in
**Admin → Roles & permissions**.

Enforcement is layered: UI (hidden controls) → server guards
(`lib/rbac/guards.ts` in every page/action/route) → Postgres RLS + triggers.

---

## 3b. Google sign-in for event registration

Visitors must sign in with a **@citchennai.net Google account** before
registering for events (separate from admin logins, which stay
email/password). Orders are linked to the account; visitors see "Your
registrations" with a **QR entry pass** (their name in the centre) for every
paid order.

### Signed, unforgeable QR passes

The QR encodes `YUV26|v1|<order-id>|<signature>` where the signature is an
HMAC-SHA256 (key derived from `APP_ENCRYPTION_KEY`) that only the server can
produce. Passes are issued by `GET /api/ticket/<orderId>` **only for paid
orders and only to the order's owner** (or an admin) — the browser never
constructs a payload, so nobody can generate a valid pass themselves, and an
unpaid/cancelled order has no pass at all.

**Check-in:** use **Admin → Gate check-in** (`/admin/checkin`) - phone-first,
needs only the `checkin.verify` permission (make a "gate_staff" role with just
that; volunteers never see revenue or attendee exports). Pick the gate's
event: check-ins are recorded **per event** with who scanned, so multi-event
orders scan cleanly at each of their gates while a repeat at the same gate
warns; mis-scans have an **Undo** button. The same tool also lives on Orders
& payments.
Tap **Open camera scanner** (rear camera; native BarcodeDetector with a jsQR
fallback for iOS) and point it at the pass, or focus the text box and use a
hardware scanner / paste. The signature is verified server-side and the
attendee's name, events and payment status come straight from the database.
**The first valid scan marks the order checked-in** (atomic - two gates can't
both claim it); scanning the same pass again shows an "ALREADY CHECKED IN at
<time>" warning with a beep, so one ticket can't admit two people (migration
0005). Checked-in orders show a pill in the orders table. A rotated `APP_ENCRYPTION_KEY` invalidates
previously scanned-and-saved payload copies, but passes are re-issued live on
every view, so attendees are unaffected.

### Confirmation emails (Gmail + Nodemailer, hosted on Render or Google Cloud)

When an order becomes paid (card payment verified, webhook capture, or a
free/demo registration), the app sends a branded confirmation email: stamp
logo, the attendee's entries with dates/times, amount, the **signed QR pass
inline** (scannable at the gate straight from the email) and a "Download
ticket (PDF)" button back to the site.

Setup (step-by-step Render guide: `docs/EMAIL.md`; gcloud alternative in
`google-cloud/email-function/README.md`):
1. Create a Gmail app password (2FA required).
2. Host the sender. **Render (recommended, no CLI):** New → Blueprint →
   pick this repo — `render.yaml` creates the `yuvenza-email` free web
   service; fill in the Gmail env vars. **Or Google Cloud:**
   `gcloud functions deploy … --gen2 --runtime=nodejs20` (exact command in
   the README).
3. Set `EMAIL_FUNCTION_URL` + `EMAIL_FUNCTION_SECRET` in the app's env.
4. Run `supabase/migrations/0006_confirmation_email.sql`.

Sending is **idempotent** (an atomic claim on
`orders.confirmation_email_sent_at` means verify + webhook can race without
double-sending; failures release the claim so retries resend) and **never
blocks a payment** — with the env vars unset, emails are simply skipped.
Preview the template any time: `node scripts/email-demo.mjs` writes an
HTML + PDF preview to ~/Downloads.

### Live slot availability (Realtime)

Each event can carry a **capacity** (Admin → Events → edit; empty =
unlimited). A Postgres trigger keeps a per-event counter of paid
registrations (`event_registrations`), and browsers subscribe to it over
**Supabase Realtime** — remaining slots ("97 / 120 slots left") update on the
registration page, the /events page and the admin events list **the moment
someone pays, with no refresh**. Sold-out events can't be added to the cart
and the checkout API rejects them server-side (migration 0004; run
`select public.refresh_event_registrations();` any time you need to rebuild
the counters). Two people paying for the final slot at the same instant can
both succeed — a standard, tiny oversell window.

### Public events page (/events)

A showcase page listing every published event with a **4:3 image** (uploaded
in Admin → Events → edit → *Showcase image*), the full details write-up,
schedule, fee and live slots. Linked from the home page events section.

### Event schedule & clash prevention

Each event can carry a calendar date plus start/end times (Admin → Events →
edit → *Schedule*, with native date/time pickers). On the registration page,
events that overlap in time can't be added together — the card shows
"Clashes with X" and the button disables — and the checkout API re-validates
the rule server-side, so it can't be bypassed. Events without times
(multi-day sprints, open entries) never clash.

### One-time setup

1. **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)):
   - Create/select a project → *APIs & Services → OAuth consent screen*:
     External, app name "Yuvenza", add your domains. Publish the app.
   - *APIs & Services → Credentials → Create credentials → OAuth client ID*:
     type **Web application**;
     - Authorized JavaScript origins: `https://<your-site>`, `http://localhost:3000`
     - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
       (shown verbatim in the Supabase dashboard on the Google provider page)
   - Copy the **Client ID** and **Client secret**.
2. **Supabase Dashboard** → Authentication → Sign In / Providers → **Google**:
   enable it and paste the Client ID + secret.
3. Run `supabase/migrations/0002_google_registration.sql` (SQL editor) if you
   haven't - it adds `orders.user_id`, the own-orders RLS policy, the
   registration settings row and the **database trigger that rejects Google
   signups from other domains** (the client-side `hd` hint alone is spoofable).

### How the restriction is enforced (three layers)

1. The sign-in button passes `hd=citchennai.net` so Google pre-filters
   accounts (UX only).
2. The `trg_guard_google_domain` trigger on `auth.users` rejects any Google
   signup whose email is not on the allowed domain - even a hand-crafted
   OAuth request cannot create an account.
3. The OAuth callback and the checkout API re-check the domain server-side.

The allowed domain is editable in **Admin → Settings → Registration** (`*`
disables the restriction). Google-authenticated visitors get **no admin
role** - they are bounced from `/admin` - and admin email/password accounts
are exempt from the domain rule.

---

## 4. Razorpay

1. Create a [Razorpay](https://razorpay.com) account → API Keys (start in
   Test mode: `rzp_test_…`).
2. Enter the **key id** and **key secret** in **Admin → Settings → Razorpay
   payments**. They are encrypted with `APP_ENCRYPTION_KEY` (AES-256-GCM) and
   stored in `app_secrets`; the secret is write-only and never returns to any
   browser. (Alternatively set the `RAZORPAY_*` env vars — panel values win.)
3. **Webhook**: Razorpay Dashboard → Webhooks → Add:
   - URL: `https://<your-site>/api/webhooks/razorpay`
   - Events: `payment.captured`, `payment.failed`, `order.paid`
   - Secret: any strong string — save the same value in the admin panel
     ("Webhook secret") or `RAZORPAY_WEBHOOK_SECRET`.

### Payment flow

```
client → POST /api/checkout        server recomputes the total from the events
                                   table, creates the DB order + Razorpay order
client → Razorpay Checkout (modal) card/UPI handled entirely by Razorpay
client → POST /api/checkout/verify server verifies the HMAC-SHA256 signature
                                   with the key secret → order = paid
Razorpay → POST /api/webhooks/razorpay   authoritative reconciliation (idempotent)
```

- Free selections (₹0) are recorded directly as paid, no gateway.
- **No credentials configured → demo mode**: registrations are recorded
  (flagged `demo`) and clearly labelled in the UI — local dev never errors.
- Cancelled/dismissed and failed payments are recorded (`cancelled`/`failed`)
  and can never downgrade a paid order. Duplicate confirmations are no-ops.
- Amounts are stored in **paise**; totals are always computed server-side.

If you rotate `APP_ENCRYPTION_KEY`, stored credentials become undecryptable —
just re-enter them in the admin panel.

### Load & abuse protection

- Checkout, payment-verify, cancel and ticket APIs are **rate-limited per
  IP** (10–30 req/min). The limiter is per server instance — ideal burst
  protection; swap in Upstash Redis if you ever need a strict global limit.
- Everything else scales statelessly: public pages are ISR-cached on the CDN,
  order writes are single-row inserts, Razorpay handles payment concurrency,
  and Supabase's pooled Postgres takes the reads. A registration rush hits
  the CDN for pages and only touches the database at the moment of checkout.

---

## 4b. Separate admin deployment (two Vercel projects)

The admin panel is fully isolated from the public site — its own root layout,
its own stylesheet (plain system fonts, none of the site's display fonts), no
shared CSS or vendor scripts. One codebase can therefore be deployed as two
Vercel projects:

| | Public site project | Admin panel project |
|---|---|---|
| Domain | `yuvenza.example.com` | `admin.yuvenza.example.com` |
| `DEPLOY_TARGET` | `site` | `admin` |
| Behaviour | all `/admin` routes return **404** | `/` redirects to `/admin` |
| Needs Supabase env vars | yes (content) | yes (everything) |
| Needs `SUPABASE_SECRET_KEY`, `APP_ENCRYPTION_KEY` | yes (checkout APIs) | yes |

Steps:

1. In Vercel, create a **second project** from the same Git repository
   (Add New → Project → import the repo again).
2. On the new project set `DEPLOY_TARGET=admin` plus the same
   Supabase/encryption env vars; give it its own domain (e.g.
   `admin.yuvenza.example.com`).
3. On the original project set `DEPLOY_TARGET=site`.
4. Point the Razorpay webhook at the deployment that serves the checkout APIs
   (the public-site project, since the registration page lives there).

Leave `DEPLOY_TARGET` unset locally to get both surfaces from one
`npm run dev`. Admin mutations still revalidate public pages instantly only on
a combined deployment; on split hosting the public site refreshes on its ISR
interval (≤5 minutes), which is the expected trade-off.

> Note: middleware env vars are captured at build time, so `DEPLOY_TARGET`
> must be present when the project is **built** (Vercel project env vars are —
> no extra action needed there). To try a target locally:
> `DEPLOY_TARGET=site npm run build && DEPLOY_TARGET=site npm start`.

---

## 5. Vercel Analytics, Speed Insights & Observability

The code side is fully wired; each feature below lists the one-time dashboard
step and its plan gate (verified against the Vercel docs, mid-2026).

### Web Analytics (all plans)

- Code: `<Analytics />` from `@vercel/analytics/next` in the **public site's**
  root layout (`app/(site)/layout.tsx`). The admin panel is deliberately not
  tracked - internal traffic would pollute the data and burn quota.
- **Enable once**: Vercel dashboard → **Analytics** (sidebar) → select the
  project → **Enable**, then redeploy. Verify: page visits fire a request to
  `/_vercel/insights/view` in the browser Network tab.
- **Custom events** (Pro/Enterprise only): the registration funnel is already
  instrumented - `Sign In Started`, `Checkout Opened`, `Registration
  Completed` (mode + entries + amount), `Payment Failed`, `Payment
  Cancelled`. On Hobby these calls are harmless no-ops; upgrade and they
  appear under Analytics → Web Analytics → **Events** with no code change.

### Speed Insights

- Code: `<SpeedInsights />` from `@vercel/speed-insights/next`, public site
  only. Does not track in development.
- **Enable once**: dashboard → **Speed Insights** (sidebar) → select project
  → **Enable**, then redeploy.
- **Managing usage**: billed in events; Hobby = 1 project, **10,000
  events/month cap** (collection pauses when hit, 7-day window); Pro = $10
  per project/month + $0.65 per 10k events, 30-day window. If a traffic spike
  threatens the cap, lower sampling in code, e.g.
  `<SpeedInsights sampleRate={0.5} />` (sends 50% of page views), and/or drop
  routes with `beforeSend={(d) => (d.url.includes("/x") ? null : d)}`.
  Usage lives at dashboard → **Usage** → Speed Insights.

### Tracing / OpenTelemetry (all plans, 1M spans/month)

- Code: `instrumentation.ts` registers `@vercel/otel`
  (`registerOTel({ serviceName: "yuvenza" })`). Vercel auto-collects
  infrastructure + fetch spans; Next.js adds route/render spans. No
  next.config changes needed.
- **View traces**: on a deployment, open the Vercel toolbar → **Tracing** →
  Start Tracing Session; or from the CLI:
  `vercel curl --trace /api/checkout` then `vercel traces get <req-id> --open`.
  In the dashboard: project → **Logs** → tracing icon → request → **Trace**.

### Debugging production errors

- Code: `instrumentation.ts` exports Next's `onRequestError` hook - every
  uncaught server error logs ONE structured JSON line tagged
  `yuvenza.request-error` (message, digest, path, route, trimmed stack).
- Find errors with the CLI (project must be linked with `vercel link`):
  ```bash
  vercel logs --environment production --status-code 5xx --since 1h
  vercel logs --environment production --query '"yuvenza.request-error"' --since 1h --expand
  vercel logs --request-id req_xxxxx --expand
  vercel bisect --good <url> --bad <url> --path /api/failing-route
  vercel rollback <previous-deployment-url>
  ```

### Alerts (dashboard-only)

Team **Settings → Alerts** → **Add Rule** → trigger **Error anomaly**
(recommended: 5xx; fires when the 5-min error rate is >4σ above the 24-h
average) or **Usage anomaly** (function invocations/duration, data transfer,
edge requests) → scope to this project → set severity → subscribe email /
Slack / webhook. Sensible starter: one High-severity 5xx error-anomaly rule
covering both site and admin projects.

### Observability Insights & Observability Plus

- Every project has a base **Observability** dashboard (project →
  Observability): function invocations/error rates, external API latency
  (Supabase + Razorpay calls show up here), edge requests incl. bot
  breakdowns, image optimization, ISR - see the docs' Insights reference.
- **Observability Plus** is a paid add-on (**paid Pro/Enterprise only**,
  $1.20 per 1M events): 30-day retention, per-path breakdowns, latency p75
  per route, and the query builder. Enable at team **Settings → Billing →
  Observability Plus** once on Pro; exclude low-value projects from Plus
  there to control cost. Not available on Hobby or Pro trials.

---

## 6. Admin panel tour

`/admin` (any signed-in, active user):

- **Dashboard** — content counts, paid orders, revenue, latest orders.
- **Work / Case studies** — search, status filter, pagination, create/edit,
  publish/unpublish, delete (confirmation), cover image upload with alt text.
- **Events** — same, plus fee (INR), date label, slots, badge.
- **Site sections** — hero, statement, manifesto, pillars, section headers,
  testimonials, stats, join CTA, and **fest** (countdown date/label, venue).
  `*x*` renders the serif accent letter; `*_x*` the spaced variant.
- **Media library** — drag-and-drop uploads (progress bar, 10 MB/image types
  validated client- and server-side), alt/caption editing, copy-URL, delete.
- **Orders & payments** — searchable registration + payment trail with
  status / event / check-in filters, live summary cards (matching, paid,
  filtered revenue, checked-in), gate QR scanner, per-order "Resend email"
  (needs `payments.manage`), and **Export CSV** honouring the active filters
  (filter by an event to download its attendee list). Exports page through
  Supabase's Max-Rows cap automatically and warn if the 10k-row ceiling is
  hit.
- **Users** — search, role filter (incl. "no role" Google visitors),
  pagination, CSV export, invite users, assign roles, deactivate/reactivate.
- **Roles & permissions** — create roles, toggle granular permissions
  (super-admin only).
- **Settings** — site name/description, social links, registration open/closed,
  Razorpay credentials (encrypted, write-only).

Public pages revalidate automatically when content is saved (and at most
every 5 minutes otherwise).

---

## 7. Local development

```bash
npm install
npm run dev        # http://localhost:3000 — works with no env at all
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest (crypto, payment verification, RBAC, checkout)
npm run build      # production build
```

Without `.env.local` the site serves the built-in fallback content, checkout
runs in demo mode, and `/admin` shows a setup notice.

---

## 8. Pre-deployment checklist

- [ ] Supabase migration + seed applied; super admin promoted.
- [ ] All env vars set in Vercel (incl. `APP_ENCRYPTION_KEY`, `NEXT_PUBLIC_SITE_URL`).
- [ ] Supabase Auth: public signups disabled.
- [ ] Razorpay keys entered (test first, then live) + webhook configured.
- [ ] Analytics + Speed Insights enabled in the Vercel dashboard.
- [ ] Test a full test-mode payment and check it lands in Admin → Orders.
- [ ] Review content in the admin panel (fest dates, event fees, hero copy).
- [ ] Font licenses for Canopee / Editorial New / Domaine (see README credits).
