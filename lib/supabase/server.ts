import "server-only";

/**
 * Server-side Supabase clients.
 *
 * - `getServerSupabase()`  - user-context client bound to the request cookies.
 *   RLS applies with the signed-in user's permissions. Use for everything the
 *   current user does in the admin panel.
 * - `getServiceSupabase()` - service-role client that BYPASSES RLS. Only for
 *   privileged server work (payments, user management, secrets) and only after
 *   an explicit permission check in code. Never import from client components.
 * - `getAnonServerSupabase()` - cookie-less anon client for public content
 *   reads from server components (safe during static generation).
 */
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export type TypedServerSupabase = SupabaseClient<Database>;

export async function getServerSupabase(): Promise<TypedServerSupabase | null> {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) return null;

  const cookieStore = await cookies();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Session refresh is handled by middleware, so this is safe.
        }
      },
    },
  });
}

export function getAnonServerSupabase(): TypedServerSupabase | null {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) return null;
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getServiceSupabase(): TypedServerSupabase | null {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!url || !serviceKey) return null;
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
