/**
 * Media constants shared by the upload actions, the uploader component and the
 * admin pages. Client-safe.
 */

export const MEDIA_BUCKET = "media";

/** Keep in sync with the bucket's file_size_limit in the migration. */
export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;

export const MEDIA_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
] as const;

export const MEDIA_FOLDERS = ["case-studies", "events", "content", "general"] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

/** Public URL for an object in the public media bucket. */
export function publicMediaUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
