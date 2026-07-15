"use client";

/**
 * Live registration counts, streamed over Supabase Realtime.
 *
 * All hook instances on a page share ONE websocket channel (module-level
 * store with reference counting), so a table of 50 events costs the same as
 * a single badge. Counts update the moment an order is paid anywhere -
 * no polling, no refresh. If Realtime is unavailable the initial
 * server-rendered counts simply stay static.
 */
import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Counts = Record<string, number>;
type Listener = (counts: Counts) => void;

const cache: Counts = {};
const listeners = new Set<Listener>();
let channel: RealtimeChannel | null = null;
let refCount = 0;

function notify() {
  const snapshot = { ...cache };
  for (const listener of listeners) listener(snapshot);
}

function ensureChannel() {
  if (channel) return;
  const supabase = getBrowserSupabase();
  if (!supabase) return;
  channel = supabase
    .channel("live-event-slots")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "event_registrations" },
      (payload) => {
        const row = (payload.new ?? payload.old) as
          | { event_slug?: string; registered?: number }
          | null;
        if (!row?.event_slug) return;
        cache[row.event_slug] =
          payload.eventType === "DELETE" ? 0 : (row.registered ?? 0);
        notify();
      }
    )
    .subscribe();
}

function releaseChannel() {
  if (refCount > 0 || !channel) return;
  const supabase = getBrowserSupabase();
  void supabase?.removeChannel(channel);
  channel = null;
}

/**
 * @param initial server-rendered counts used as the starting snapshot
 * @returns live map of event slug -> paid registrations
 */
export function useLiveSlots(initial: Counts = {}): Counts {
  const [counts, setCounts] = useState<Counts>(() => ({ ...initial, ...cache }));

  useEffect(() => {
    // Seed the shared cache with any slugs it hasn't seen yet.
    for (const [slug, n] of Object.entries(initial)) {
      if (!(slug in cache)) cache[slug] = n;
    }
    const listener: Listener = (snapshot) => setCounts((prev) => ({ ...prev, ...snapshot }));
    listeners.add(listener);
    refCount++;
    ensureChannel();
    if (Object.keys(cache).length > 0) listener({ ...cache });

    return () => {
      listeners.delete(listener);
      refCount--;
      releaseChannel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return counts;
}
