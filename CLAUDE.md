https://vercel.com/docs/analytics/quickstart# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

Yuvenza — the youth club of Chennai Institute of Technology. A Next.js 15
(App Router) + React 19 + TypeScript (strict) site with a Supabase backend
(database, auth, storage, RLS/RBAC), Razorpay payments, Google sign-in for
visitors, signed QR entry passes with gate check-in, live slot availability
over Supabase Realtime, and confirmation emails via a Google Cloud Function.

## Commands

```bash
npm run dev        # localhost:3000 - works with ZERO env vars (fallback content)
npm run build      # production build; must stay green
npm run lint       # eslint (flat config)
npm run typecheck  # tsc --noEmit
npm test           # vitest - tests/ (crypto, tickets, RBAC, checkout, clash, capacity)
node scripts/email-demo.mjs   # render email template -> HTML+PDF in ~/Downloads
```

Always run lint + typecheck + test + build before declaring work done.

## Architecture rules (violating these breaks real invariants)

- **Two root layouts via route groups.** `app/(site)/` = public site
  (webflow.css + globals.css + brand fonts + vendor scripts).
  `app/(admin)/` = admin panel with ONLY `app/(admin)/admin.css`
  (system fonts, `adm-` prefixed classes). Never import public CSS into the
  admin or vice versa. There is no app-level root layout; the global 404 is
  the `app/(site)/[...rest]/page.tsx` catch-all.
- **Fallback-first content.** Public pages read Supabase through
  `lib/content/queries.ts` and fall back to `lib/content/fallback.ts` when
  env is missing, errors occur, or tables are empty. The site must always
  build and run with zero env vars. `fallback.ts` must mirror
  `supabase/seed.sql` — edit both together.
- **RBAC is triple-enforced**: UI gating → server guards
  (`lib/rbac/guards.ts`, called in every page/action/route) → Postgres RLS +
  triggers. Never rely on hiding a button. The permission catalog lives in
  `lib/rbac/permissions.ts` and is mirrored in `seed.sql`.
- **Identity guard is latency-tuned — don't "fix" it back.** Middleware uses
  local `getSession()`; `getAdminIdentity` reads the cookie session and does
  ONE joined query whose JWT PostgREST verifies (the DB is the trust anchor,
  not the cookie), plus a 30s in-memory cache keyed by access token. RLS
  re-checks every real read/write, so the cache can't grant access.
- **Secrets**: Razorpay credentials are AES-256-GCM encrypted
  (`lib/security/crypto.ts`, key = `APP_ENCRYPTION_KEY`) in `app_secrets` —
  a table with RLS on and NO policies (service-role only). Secret values
  never reach the browser. `site_settings` is publicly readable — never put
  secrets there.
- **Money**: `orders.amount` and Razorpay amounts are in **paise**;
  `events.price` is in **rupees**. Totals are always recomputed server-side
  (`lib/checkout.ts`) — client amounts are never trusted.
- **QR passes are server-signed** (`lib/ticket.ts`,
  `YUV26|v1|orderId|HMAC-sig`, key derived from `APP_ENCRYPTION_KEY`).
  Payloads are only minted by `/api/ticket/[orderId]` (paid orders,
  owner/admin only). The browser never constructs one.
- **Shared business rules live in `lib/` and are applied twice** — once in
  the UI, once server-side: time clashes (`lib/events/clash.ts`), capacity /
  sold-out (`lib/events/capacity.ts`), email domain
  (`lib/auth/allowedDomain.ts`). If you change a rule, both callers update
  automatically — never fork the logic.
- **Visitor auth vs admin auth are separate.** Visitors: Google OAuth,
  restricted to @citchennai.net (enforced by an `auth.users` trigger, the
  OAuth callback, and the checkout API; `hd` param is only a UX hint). New
  signups get NO role; role-less users are redirected from `/admin` to `/`
  (never to `/admin/login` — middleware would loop). Admins: email/password,
  created from Admin → Users.
- **Live slots**: `event_registrations` counters are maintained ONLY by the
  Postgres trigger on orders; browsers stream them via one shared Realtime
  channel (`lib/hooks/useLiveSlots.ts` — module-level refcounted store; keep
  it a single channel).
- **Emails** (`lib/email/notify.ts` → `google-cloud/email-function/`):
  idempotent via an atomic claim on `orders.confirmation_email_sent_at`
  (claim released on failure so webhook retries resend); email failures must
  never affect the payment flow. Unset env = silently skipped.

## Database changes

Migrations are numbered files in `supabase/migrations/` (0001–0006 so far),
applied manually in the Supabase SQL editor. When adding one:
1. Create `supabase/migrations/000N_name.sql` (idempotent where possible).
2. Update `supabase/seed.sql` if seed data is affected.
3. Regenerate `supabase/apply_all.sql` (concatenation: all migrations + seed).
4. Update the hand-written types in `lib/supabase/types.ts`.
5. Tell the user which migration to run — Claude cannot run DDL remotely.

## Conventions

- Public-site copy: no en/em dashes (use commas, full stops, or `·`).
  Display-heading accents: `*x*` → `.f-span`, `*_x*` → `.f-span space`
  (rendered by `components/Accents.tsx`; used in `site_content` values).
- Public site uses plain `<a>` navigation deliberately (vendor scripts
  re-init per document load); `no-html-link-for-pages` and `no-img-element`
  are disabled in eslint for this reason. The admin uses `next/link`.
- Public CSS: append to `app/globals.css` in clearly-marked sections;
  fluid `vw`/`clamp()` sizing; ink `#1d1d1b` on paper `#cdc6be`.
  Admin CSS: `app/(admin)/admin.css` only, `adm-` prefix, rem sizing.
- `"use server"` files may export ONLY async functions (no consts/objects).
  Never call `redirect()` inside a try/catch in an action — build the
  destination string and redirect after (see existing actions; `errorMessage`
  in `app/(admin)/admin/actions/helpers.ts` rethrows NEXT_* control errors).
- Server actions redirect with `?ok=`/`?err=` flash params
  (`components/admin/Flash.tsx`); forms needing inline errors use
  `useActionState`.
- Editors without `content.publish` get their submitted `published` value
  coerced to the existing/false value — not an error (the checkbox is
  disabled in the UI; a DB trigger enforces it too).
- Env vars are read ONLY in `lib/env.ts`. Middleware env is captured at
  build time (`DEPLOY_TARGET` must be present when building).
- `DEPLOY_TARGET=site|admin` splits the one codebase across two Vercel
  projects (site 404s `/admin`; admin redirects `/` → `/admin`); unset =
  combined (local dev).

## Observability

`instrumentation.ts` registers `@vercel/otel` tracing (all plans) and exports
Next's `onRequestError` hook, which logs one structured JSON line tagged
`yuvenza.request-error` per uncaught server error (queryable via
`vercel logs --query`). Analytics + Speed Insights load in the PUBLIC layout
only (admin traffic is deliberately untracked - hobby quotas are small).
Conversion funnel custom events (`track()` in EventsClient) are Pro-gated
no-ops on Hobby. Dashboard setup steps live in docs/SETUP.md §5.

## Env vars (see .env.example)

`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `_ANON_KEY`),
`SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`, server-only),
`APP_ENCRYPTION_KEY` (server-only; encrypts credentials AND signs QR passes —
rotating it invalidates both), optional `RAZORPAY_*` fallbacks,
`EMAIL_FUNCTION_URL`/`EMAIL_FUNCTION_SECRET`, optional `DEPLOY_TARGET`.

## Docs

`docs/SETUP.md` is the operator manual (Supabase, Google OAuth, Razorpay,
emails, split deployment, roles table). `google-cloud/email-function/README.md`
covers the mail function deploy. Keep both current when behavior changes.
