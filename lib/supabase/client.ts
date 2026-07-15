"use client";

/**
 * Browser Supabase client (anon key, RLS enforced). Used by client components
 * for auth and direct storage uploads. Returns null when Supabase isn't
 * configured so the public site keeps working without a backend.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export type TypedSupabaseClient = SupabaseClient<Database>;

let client: TypedSupabaseClient | null = null;

export function getBrowserSupabase(): TypedSupabaseClient | null {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) return null;
  if (!client) {
    client = createBrowserClient<Database>(url, anonKey);
  }
  return client;
}
