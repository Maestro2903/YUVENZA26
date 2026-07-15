import "server-only";

/**
 * Public-site data layer. Reads from Supabase when configured and falls back
 * to the static content in lib/content/fallback.ts on missing configuration,
 * errors, or an unseeded database - the site never renders empty because the
 * backend is unavailable.
 *
 * Pages that use these helpers should set `export const revalidate = ...`;
 * admin mutations call revalidatePath() so edits appear immediately.
 */
import { getAnonServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { CaseStudyRow, EventRow } from "@/lib/supabase/types";
import {
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_REGISTRATION_SETTINGS,
  DEFAULT_SECTIONS,
  FALLBACK_EVENTS,
  FALLBACK_WORK,
} from "@/lib/content/fallback";
import type {
  EventItem,
  GeneralSettings,
  RegistrationSettings,
  SectionKey,
  SiteSections,
  WorkItem,
} from "@/lib/content/types";

function warnFallback(what: string, detail?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[content] Falling back to static ${what}${detail ? `: ${String(detail)}` : ""}. ` +
        "Configure Supabase and run supabase/seed.sql to serve content from the database."
    );
  }
}

export function mapCaseStudyRow(row: CaseStudyRow): WorkItem {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    year: row.year,
    client: row.client ?? undefined,
    description: row.description,
    story: row.story ?? undefined,
    liveSite: row.live_site ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    coverAlt: row.cover_alt ?? undefined,
  };
}

export function mapEventRow(row: EventRow): EventItem {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    dateLabel: row.date_label,
    eventDate: row.event_date ?? undefined,
    // Postgres time columns serialise as "HH:MM:SS" - keep "HH:MM".
    startTime: row.start_time ? row.start_time.slice(0, 5) : undefined,
    endTime: row.end_time ? row.end_time.slice(0, 5) : undefined,
    price: row.price,
    description: row.description,
    slots: row.slots ?? undefined,
    capacity: row.capacity ?? undefined,
    imageUrl: row.image_url ?? undefined,
    imageAlt: row.image_alt ?? undefined,
    details: row.details ?? undefined,
    rules: row.rules ?? undefined,
    badge: row.badge ?? undefined,
  };
}

export async function getEvent(slug: string): Promise<EventItem | null> {
  const events = await getEvents();
  return events.find((e) => e.slug === slug) ?? null;
}

/** Current paid-registration counts per event slug (live via Realtime on the client). */
export async function getEventRegistrations(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured()) return {};
  try {
    const supabase = getAnonServerSupabase();
    if (!supabase) return {};
    const { data, error } = await supabase
      .from("event_registrations")
      .select("event_slug, registered");
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((r) => [r.event_slug, r.registered]));
  } catch (err) {
    warnFallback("event registrations", err);
    return {};
  }
}

export async function getWorkItems(): Promise<WorkItem[]> {
  if (!isSupabaseConfigured()) return FALLBACK_WORK;
  try {
    const supabase = getAnonServerSupabase();
    if (!supabase) return FALLBACK_WORK;
    const { data, error } = await supabase
      .from("case_studies")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) {
      warnFallback("work items", "no published rows");
      return FALLBACK_WORK;
    }
    return data.map(mapCaseStudyRow);
  } catch (err) {
    warnFallback("work items", err);
    return FALLBACK_WORK;
  }
}

export async function getWorkItem(slug: string): Promise<WorkItem | null> {
  const items = await getWorkItems();
  return items.find((w) => w.slug === slug) ?? null;
}

/** Previous / next item in display order, wrapping around. */
export async function getWorkNeighbors(
  slug: string
): Promise<{ prev: WorkItem; next: WorkItem } | null> {
  const items = await getWorkItems();
  const i = items.findIndex((w) => w.slug === slug);
  if (i === -1 || items.length === 0) return null;
  return {
    prev: items[(i - 1 + items.length) % items.length],
    next: items[(i + 1) % items.length],
  };
}

export async function getEvents(): Promise<EventItem[]> {
  if (!isSupabaseConfigured()) return FALLBACK_EVENTS;
  try {
    const supabase = getAnonServerSupabase();
    if (!supabase) return FALLBACK_EVENTS;
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) {
      warnFallback("events", "no published rows");
      return FALLBACK_EVENTS;
    }
    return data.map(mapEventRow);
  } catch (err) {
    warnFallback("events", err);
    return FALLBACK_EVENTS;
  }
}

function mergeSection<K extends SectionKey>(key: K, data: unknown): SiteSections[K] {
  const defaults = DEFAULT_SECTIONS[key];
  if (!data || typeof data !== "object" || Array.isArray(data)) return defaults;
  return { ...defaults, ...(data as Partial<SiteSections[K]>) };
}

/** All editable site sections, merged over their defaults. */
export async function getSections(): Promise<SiteSections> {
  if (!isSupabaseConfigured()) return DEFAULT_SECTIONS;
  try {
    const supabase = getAnonServerSupabase();
    if (!supabase) return DEFAULT_SECTIONS;
    const { data, error } = await supabase.from("site_content").select("key, data");
    if (error) throw error;
    const byKey = new Map((data ?? []).map((row) => [row.key, row.data]));
    const merged = {} as SiteSections;
    for (const key of Object.keys(DEFAULT_SECTIONS) as SectionKey[]) {
      (merged as Record<string, unknown>)[key] = mergeSection(key, byKey.get(key));
    }
    return merged;
  } catch (err) {
    warnFallback("site sections", err);
    return DEFAULT_SECTIONS;
  }
}

export async function getSection<K extends SectionKey>(key: K): Promise<SiteSections[K]> {
  const sections = await getSections();
  return sections[key];
}

export async function getRegistrationSettings(): Promise<RegistrationSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_REGISTRATION_SETTINGS;
  try {
    const supabase = getAnonServerSupabase();
    if (!supabase) return DEFAULT_REGISTRATION_SETTINGS;
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "registration")
      .maybeSingle();
    if (error) throw error;
    if (!data?.value || typeof data.value !== "object" || Array.isArray(data.value)) {
      return DEFAULT_REGISTRATION_SETTINGS;
    }
    return { ...DEFAULT_REGISTRATION_SETTINGS, ...(data.value as Partial<RegistrationSettings>) };
  } catch (err) {
    warnFallback("registration settings", err);
    return DEFAULT_REGISTRATION_SETTINGS;
  }
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_GENERAL_SETTINGS;
  try {
    const supabase = getAnonServerSupabase();
    if (!supabase) return DEFAULT_GENERAL_SETTINGS;
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "general")
      .maybeSingle();
    if (error) throw error;
    if (!data?.value || typeof data.value !== "object" || Array.isArray(data.value)) {
      return DEFAULT_GENERAL_SETTINGS;
    }
    return { ...DEFAULT_GENERAL_SETTINGS, ...(data.value as Partial<GeneralSettings>) };
  } catch (err) {
    warnFallback("general settings", err);
    return DEFAULT_GENERAL_SETTINGS;
  }
}
