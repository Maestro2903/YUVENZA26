import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getRegistrationSettings } from "@/lib/content/queries";
import { isAllowedEmail, normalizeDomain } from "@/lib/auth/allowedDomain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /auth/callback - Google OAuth landing (PKCE).
 * Exchanges the auth code for a session, re-checks the college-domain rule
 * (the auth.users trigger already blocked disallowed signups at the database;
 * this guards pre-existing accounts and acts as belt-and-braces), then sends
 * the visitor back to where they were registering.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error_description");
  const nextParam = url.searchParams.get("next") ?? "/registration";
  // Only allow same-site relative redirects.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/registration";

  const back = (params?: Record<string, string>) => {
    const dest = new URL(next, url.origin);
    for (const [k, v] of Object.entries(params ?? {})) dest.searchParams.set(k, v);
    return NextResponse.redirect(dest);
  };

  const settings = await getRegistrationSettings();
  const domain = normalizeDomain(settings.allowedEmailDomain);

  // The provider (or our database trigger) refused the sign-in.
  if (providerError) {
    const friendly = providerError.includes("can register")
      ? `Only @${domain} Google accounts can register.`
      : "Sign-in was cancelled or failed. Please try again.";
    return back({ authError: friendly });
  }
  if (!code) {
    return back({ authError: "Sign-in failed. Please try again." });
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return back({ authError: "Sign-in is not configured yet." });
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.warn("[auth] Code exchange failed:", error?.message);
    return back({ authError: "Sign-in failed. Please try again." });
  }

  if (!isAllowedEmail(data.user.email, domain)) {
    await supabase.auth.signOut();
    return back({ authError: `Only @${domain} Google accounts can register.` });
  }

  return back();
}
