/**
 * Central environment configuration. Every process.env read lives here so the
 * rest of the codebase can ask "is X configured?" instead of poking at env
 * vars directly. All getters are safe to call when a variable is missing -
 * the app degrades gracefully (static content fallback, demo checkout).
 */

export function getSupabaseUrl(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || null;
}

/**
 * Public API key for browser/anon access. Supabase issues these under two
 * names: the legacy JWT "anon" key and the newer "publishable" key
 * (sb_publishable_…). Either works; both are safe to expose (RLS applies).
 */
export function getSupabaseAnonKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    null
  );
}

/** True when the public Supabase client can be constructed. */
export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

/**
 * Server-only privileged key - bypasses RLS. Never expose to the client.
 * Supabase issues these under two names: the legacy "service_role" JWT and
 * the newer "secret" key (sb_secret_…). Either works.
 */
export function getSupabaseServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || null;
}

/** True when privileged server-side Supabase operations are possible. */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

/**
 * Server-only. 32-byte key (base64 or hex) used to encrypt secrets at rest
 * (e.g. Razorpay credentials stored through the admin panel).
 */
export function getAppEncryptionKey(): string | null {
  return process.env.APP_ENCRYPTION_KEY || null;
}

/**
 * Which surface this deployment serves. The same codebase can be deployed as
 * two Vercel projects: the public site (target "site", /admin disabled) and
 * the admin panel (target "admin", / redirects to /admin). Unset = combined,
 * which is what local dev uses.
 */
export type DeployTarget = "combined" | "site" | "admin";

export function getDeployTarget(): DeployTarget {
  // DEPLOY_TARGET is read at runtime (middleware); the NEXT_PUBLIC_ variant
  // also works but is inlined at build time. Either may be set.
  const t = process.env.DEPLOY_TARGET || process.env.NEXT_PUBLIC_DEPLOY_TARGET;
  return t === "site" || t === "admin" ? t : "combined";
}

/** Absolute site URL, used for metadataBase and payment callbacks. */
export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

/** Env fallbacks for Razorpay when nothing is stored in the admin panel. */
export function getRazorpayEnvConfig(): { keyId: string | null; keySecret: string | null } {
  return {
    keyId: process.env.RAZORPAY_KEY_ID || null,
    keySecret: process.env.RAZORPAY_KEY_SECRET || null,
  };
}

export function getRazorpayWebhookSecretEnv(): string | null {
  return process.env.RAZORPAY_WEBHOOK_SECRET || null;
}

/**
 * Confirmation-email service (Google Cloud Function running Nodemailer;
 * see google-cloud/email-function). Both unset = emails silently skipped.
 */
export function getEmailFunctionConfig(): { url: string; secret: string } | null {
  const url = process.env.EMAIL_FUNCTION_URL;
  const secret = process.env.EMAIL_FUNCTION_SECRET;
  return url && secret ? { url, secret } : null;
}
