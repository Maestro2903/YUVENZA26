"use server";

/**
 * Content CRUD actions: case studies, events and editable site sections.
 * Every action re-checks permissions server-side (lib/rbac/guards); RLS
 * policies and the publish-guard trigger enforce the same rules in Postgres.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { identityHasPermission, requirePermission } from "@/lib/rbac/guards";
import { getServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_SECTIONS } from "@/lib/content/fallback";
import type { SectionKey } from "@/lib/content/types";
import type { EventBadge } from "@/lib/supabase/types";
import { bool, errorMessage, intOr, isValidSlug, str, withFlash } from "./helpers";

/** Revalidate every public page that renders managed content. */
function revalidatePublic() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Case studies
// ---------------------------------------------------------------------------

export async function saveCaseStudyAction(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const listPath = "/admin/work";
  let dest: string;

  try {
    const identity = await requirePermission(id ? "content.edit" : "content.create");
    const supabase = await getServerSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");

    const slug = str(formData, "slug");
    const published = bool(formData, "published");
    if (!isValidSlug(slug)) throw new Error("Slug must be lowercase letters, numbers and dashes.");
    const title = str(formData, "title");
    const category = str(formData, "category");
    const year = str(formData, "year");
    const description = str(formData, "description");
    if (!title || !category || !year || !description) {
      throw new Error("Title, category, year and description are required.");
    }

    const canPublish = identityHasPermission(identity, "content.publish");
    const row = {
      slug,
      title,
      category,
      year,
      client: str(formData, "client") || null,
      description,
      story: str(formData, "story") || null,
      live_site: str(formData, "live_site") || null,
      cover_url: str(formData, "cover_url") || null,
      cover_alt: str(formData, "cover_alt") || null,
      sort_order: intOr(formData, "sort_order", 0),
      published,
    };

    if (id) {
      const { data: existing, error: readError } = await supabase
        .from("case_studies")
        .select("published")
        .eq("id", id)
        .single();
      if (readError) throw readError;
      // Without the publish permission the current state is kept as-is
      // (the checkbox is disabled in the UI; the DB trigger enforces too).
      if (!canPublish) row.published = existing.published;
      const { error } = await supabase.from("case_studies").update(row).eq("id", id);
      if (error) throw error;
    } else {
      if (!canPublish) row.published = false;
      const { error } = await supabase.from("case_studies").insert(row);
      if (error) throw error;
    }

    revalidatePublic();
    dest = withFlash(listPath, "ok", id ? "Case study updated." : "Case study created.");
  } catch (err) {
    dest = withFlash(id ? `${listPath}/${id}` : `${listPath}/new`, "err", errorMessage(err));
  }
  redirect(dest);
}

export async function toggleCaseStudyPublishedAction(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  let dest: string;
  try {
    await requirePermission("content.publish");
    const supabase = await getServerSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");
    const publish = bool(formData, "publish");
    const { error } = await supabase
      .from("case_studies")
      .update({ published: publish })
      .eq("id", id);
    if (error) throw error;
    revalidatePublic();
    dest = withFlash("/admin/work", "ok", publish ? "Published." : "Unpublished.");
  } catch (err) {
    dest = withFlash("/admin/work", "err", errorMessage(err));
  }
  redirect(dest);
}

export async function deleteCaseStudyAction(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  let dest: string;
  try {
    await requirePermission("content.delete");
    const supabase = await getServerSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from("case_studies").delete().eq("id", id);
    if (error) throw error;
    revalidatePublic();
    dest = withFlash("/admin/work", "ok", "Case study deleted.");
  } catch (err) {
    dest = withFlash("/admin/work", "err", errorMessage(err));
  }
  redirect(dest);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const BADGES: EventBadge[] = ["Popular", "New", "Free"];

export async function saveEventAction(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const listPath = "/admin/events";
  let dest: string;

  try {
    const identity = await requirePermission(id ? "content.edit" : "content.create");
    const supabase = await getServerSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");

    const slug = str(formData, "slug");
    const published = bool(formData, "published");
    if (!isValidSlug(slug)) throw new Error("Slug must be lowercase letters, numbers and dashes.");
    const title = str(formData, "title");
    const category = str(formData, "category");
    const dateLabel = str(formData, "date_label");
    const description = str(formData, "description");
    const price = intOr(formData, "price", -1);
    if (!title || !category || !dateLabel || !description) {
      throw new Error("Title, category, date and description are required.");
    }
    if (price < 0 || price > 1000000) throw new Error("Price must be a number ≥ 0 (in INR).");
    const badgeRaw = str(formData, "badge");
    const badge = BADGES.includes(badgeRaw as EventBadge) ? (badgeRaw as EventBadge) : null;

    // Structured schedule (calendar + clock pickers). Drives time-clash
    // detection on the registration page.
    const eventDate = str(formData, "event_date");
    const startTime = str(formData, "start_time").slice(0, 5);
    const endTime = str(formData, "end_time").slice(0, 5);
    if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      throw new Error("Event date must be a valid calendar date.");
    }
    for (const [label, t] of [["Start", startTime], ["End", endTime]] as const) {
      if (t && !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) {
        throw new Error(`${label} time must be a valid time (HH:MM).`);
      }
    }
    if ((startTime || endTime) && !eventDate) {
      throw new Error("Pick the event date before setting times.");
    }
    if ((startTime && !endTime) || (!startTime && endTime)) {
      throw new Error("Set both a start and an end time (or neither).");
    }
    if (startTime && endTime && endTime <= startTime) {
      throw new Error("End time must be after the start time.");
    }

    const capacityRaw = str(formData, "capacity");
    const capacity = capacityRaw === "" ? null : intOr(formData, "capacity", -1);
    if (capacity !== null && (capacity < 0 || capacity > 100000)) {
      throw new Error("Capacity must be a number ≥ 0 (leave empty for unlimited).");
    }

    const canPublish = identityHasPermission(identity, "content.publish");
    const row = {
      slug,
      title,
      category,
      date_label: dateLabel,
      event_date: eventDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      price,
      description,
      details: str(formData, "details") || null,
      rules: str(formData, "rules") || null,
      slots: str(formData, "slots") || null,
      capacity,
      image_url: str(formData, "image_url") || null,
      image_alt: str(formData, "image_alt") || null,
      badge,
      sort_order: intOr(formData, "sort_order", 0),
      published,
    };

    if (id) {
      const { data: existing, error: readError } = await supabase
        .from("events")
        .select("published")
        .eq("id", id)
        .single();
      if (readError) throw readError;
      if (!canPublish) row.published = existing.published;
      const { error } = await supabase.from("events").update(row).eq("id", id);
      if (error) throw error;
    } else {
      if (!canPublish) row.published = false;
      const { error } = await supabase.from("events").insert(row);
      if (error) throw error;
    }

    revalidatePublic();
    dest = withFlash(listPath, "ok", id ? "Event updated." : "Event created.");
  } catch (err) {
    dest = withFlash(id ? `${listPath}/${id}` : `${listPath}/new`, "err", errorMessage(err));
  }
  redirect(dest);
}

export async function toggleEventPublishedAction(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  let dest: string;
  try {
    await requirePermission("content.publish");
    const supabase = await getServerSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");
    const publish = bool(formData, "publish");
    const { error } = await supabase.from("events").update({ published: publish }).eq("id", id);
    if (error) throw error;
    revalidatePublic();
    dest = withFlash("/admin/events", "ok", publish ? "Published." : "Unpublished.");
  } catch (err) {
    dest = withFlash("/admin/events", "err", errorMessage(err));
  }
  redirect(dest);
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  let dest: string;
  try {
    await requirePermission("content.delete");
    const supabase = await getServerSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) throw error;
    revalidatePublic();
    dest = withFlash("/admin/events", "ok", "Event deleted.");
  } catch (err) {
    dest = withFlash("/admin/events", "err", errorMessage(err));
  }
  redirect(dest);
}

// ---------------------------------------------------------------------------
// Editable site sections (site_content)
// ---------------------------------------------------------------------------

export async function saveSectionAction(formData: FormData): Promise<void> {
  const key = str(formData, "key");
  let dest: string;
  try {
    await requirePermission("content.edit");
    if (!(key in DEFAULT_SECTIONS)) throw new Error("Unknown site section.");
    const supabase = await getServerSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");

    let data: unknown;
    try {
      data = JSON.parse(str(formData, "data"));
    } catch {
      throw new Error("The section data is not valid.");
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("The section data must be an object.");
    }

    const { error } = await supabase
      .from("site_content")
      .upsert({ key: key as SectionKey, data: data as never }, { onConflict: "key" });
    if (error) throw error;

    revalidatePublic();
    dest = withFlash(`/admin/content?section=${key}`, "ok", "Section saved.");
  } catch (err) {
    dest = withFlash(`/admin/content?section=${key || "hero"}`, "err", errorMessage(err));
  }
  redirect(dest);
}
