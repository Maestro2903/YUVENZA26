import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getDeployTarget, getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

/**
 * Two jobs:
 *
 * 1. Deploy-target routing (NEXT_PUBLIC_DEPLOY_TARGET): the same codebase can
 *    run as two separate Vercel projects - "site" serves only the public site
 *    (/admin returns 404) and "admin" serves only the panel (/ redirects to
 *    /admin). Unset = combined (local dev).
 *
 * 2. Admin gatekeeping on /admin/*: refresh the Supabase session cookies,
 *    bounce unauthenticated visitors to /admin/login, and show a setup notice
 *    when Supabase isn't configured. Fine-grained permission checks happen
 *    server-side in layouts/pages/actions (lib/rbac/guards.ts) and in RLS.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const target = getDeployTarget();

  // Root path only matters on the admin-only deployment.
  if (!pathname.startsWith("/admin")) {
    if (target === "admin" && pathname === "/") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // The public-site deployment exposes no admin surface at all.
  if (target === "site") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    if (pathname === "/admin/not-configured") return NextResponse.next();
    return NextResponse.rewrite(new URL("/admin/not-configured", request.url));
  }
  if (pathname === "/admin/not-configured") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getSession() parses the cookie locally (no network round-trip on the hot
  // path) and only hits Supabase to refresh an expired token, persisting the
  // new cookies via setAll above. Middleware only decides redirects - real
  // authentication/authorization happens in lib/rbac/guards.ts (signature-
  // verified) and in RLS, so a forged cookie gets past this redirect check
  // only to be rejected by the page guard.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const isLoginPage = pathname === "/admin/login";
  if (!user && !isLoginPage) {
    const loginUrl = new URL("/admin/login", request.url);
    if (pathname !== "/admin") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/admin", "/admin/:path*"],
};
