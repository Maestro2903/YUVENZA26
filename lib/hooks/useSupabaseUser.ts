"use client";

/**
 * Client-side auth state for the public site (visitor Google sign-in).
 * Purely presentational - server routes and RLS re-verify everything.
 */
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { normalizeDomain } from "@/lib/auth/allowedDomain";

export type SiteUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

function mapUser(user: User | null | undefined): SiteUser | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    user.email?.split("@")[0] ||
    "Guest";
  return {
    id: user.id,
    email: user.email ?? "",
    name,
    avatarUrl:
      (typeof meta.avatar_url === "string" && meta.avatar_url) ||
      (typeof meta.picture === "string" && meta.picture) ||
      null,
  };
}

export function useSupabaseUser() {
  const [user, setUser] = useState<SiteUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(mapUser(data.session?.user));
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapUser(session?.user));
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  /** Kick off Google OAuth; returns an error message when unavailable. */
  const signInWithGoogle = useCallback(async (allowedDomain: string): Promise<string | null> => {
    const supabase = getBrowserSupabase();
    if (!supabase) return "Sign-in is not configured yet. Please try again later.";
    const domain = normalizeDomain(allowedDomain);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          window.location.pathname
        )}`,
        queryParams: {
          prompt: "select_account",
          // UX hint so Google pre-filters to college accounts; the real
          // enforcement is the database trigger + server-side checks.
          ...(domain !== "*" ? { hd: domain } : {}),
        },
      },
    });
    return error ? "Could not start Google sign-in. Please try again." : null;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getBrowserSupabase();
    if (supabase) await supabase.auth.signOut();
  }, []);

  return { user, loading, signInWithGoogle, signOut };
}
