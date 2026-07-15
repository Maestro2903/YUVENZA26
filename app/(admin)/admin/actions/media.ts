"use server";

/**
 * Media library actions. Binary uploads go directly from the browser to
 * Supabase Storage through short-lived signed upload URLs (created here after
 * a permission check), which gives the client real upload progress without
 * ever proxying bytes through the Next.js server.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac/guards";
import { getServerSupabase, getServiceSupabase } from "@/lib/supabase/server";
import { getSupabaseUrl } from "@/lib/env";
import {
  MEDIA_ALLOWED_TYPES,
  MEDIA_BUCKET,
  MEDIA_FOLDERS,
  MEDIA_MAX_BYTES,
  publicMediaUrl,
} from "@/lib/media";
import { errorMessage, slugify, str, withFlash } from "./helpers";

function mediaUrl(path: string): string {
  return publicMediaUrl(getSupabaseUrl() ?? "", path);
}

export type PrepareUploadResult =
  | { ok: true; path: string; signedUrl: string; token: string; publicUrl: string }
  | { ok: false; error: string };

export async function prepareUploadAction(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  folder: string;
}): Promise<PrepareUploadResult> {
  try {
    await requirePermission("media.upload");

    if (!(MEDIA_ALLOWED_TYPES as readonly string[]).includes(input.mimeType)) {
      return { ok: false, error: "Only JPEG, PNG, WebP, GIF, AVIF or SVG images are allowed." };
    }
    if (
      !Number.isFinite(input.sizeBytes) ||
      input.sizeBytes <= 0 ||
      input.sizeBytes > MEDIA_MAX_BYTES
    ) {
      return { ok: false, error: "Images must be smaller than 10 MB." };
    }
    const folder = (MEDIA_FOLDERS as readonly string[]).includes(input.folder)
      ? input.folder
      : "general";

    const dot = input.fileName.lastIndexOf(".");
    const ext =
      dot >= 0 ? input.fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    const base = slugify(dot >= 0 ? input.fileName.slice(0, dot) : input.fileName) || "image";
    const path = `${folder}/${Date.now()}-${base}${ext ? `.${ext}` : ""}`;

    const service = getServiceSupabase();
    if (!service) return { ok: false, error: "Storage is not configured on the server." };

    const { data, error } = await service.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error("[media] createSignedUploadUrl failed:", error);
      return { ok: false, error: "Could not start the upload. Please try again." };
    }

    return {
      ok: true,
      path: data.path,
      signedUrl: data.signedUrl,
      token: data.token,
      publicUrl: mediaUrl(data.path),
    };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export type FinalizeUploadResult =
  | { ok: true; id: string; publicUrl: string }
  | { ok: false; error: string };

export async function finalizeUploadAction(input: {
  path: string;
  alt: string;
  caption: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<FinalizeUploadResult> {
  try {
    await requirePermission("media.upload");
    const supabase = await getServerSupabase();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const { data, error } = await supabase
      .from("media")
      .insert({
        bucket: MEDIA_BUCKET,
        path: input.path,
        alt: input.alt.trim() || null,
        caption: input.caption.trim() || null,
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
      })
      .select("id")
      .single();
    if (error) throw error;

    revalidatePath("/admin/media");
    return { ok: true, id: data.id, publicUrl: mediaUrl(input.path) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function updateMediaMetaAction(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const back = str(formData, "back") || "/admin/media";
  let dest: string;
  try {
    await requirePermission("media.upload");
    const supabase = await getServerSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase
      .from("media")
      .update({ alt: str(formData, "alt") || null, caption: str(formData, "caption") || null })
      .eq("id", id);
    if (error) throw error;
    dest = withFlash(back, "ok", "Media details saved.");
  } catch (err) {
    dest = withFlash(back, "err", errorMessage(err));
  }
  redirect(dest);
}

export async function deleteMediaAction(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const back = str(formData, "back") || "/admin/media";
  let dest: string;
  try {
    await requirePermission("media.delete");
    const supabase = await getServerSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");

    const { data: row, error: readError } = await supabase
      .from("media")
      .select("path")
      .eq("id", id)
      .single();
    if (readError) throw readError;

    // Remove the binary first (RLS: media.delete), then the metadata row.
    const { error: storageError } = await supabase.storage.from(MEDIA_BUCKET).remove([row.path]);
    if (storageError) throw storageError;

    const { error } = await supabase.from("media").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/admin/media");
    dest = withFlash(back, "ok", "Media deleted.");
  } catch (err) {
    dest = withFlash(back, "err", errorMessage(err));
  }
  redirect(dest);
}
