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

    const canPublish = identityHasPermission(identity, "content.publish");
    const row = {
      slug,
      title,
      category,
      date_label: dateLabel,
      price,
      description,
      slots: str(formData, "slots") || null,
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
