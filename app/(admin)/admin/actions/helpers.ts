import "server-only";

/** Shared utilities for admin server actions (not a "use server" module). */
import { AuthorizationError } from "@/lib/rbac/guards";

export function errorMessage(err: unknown): string {
  // Never swallow Next.js control-flow errors (redirect/notFound).
  if (err && typeof err === "object" && "digest" in err) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_")) throw err;
  }
  if (err instanceof AuthorizationError) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.length < 300) return m;
  }
  return "Something went wrong. Please try again.";
}

export function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

export function intOr(formData: FormData, key: string, fallback: number): number {
  const n = Number.parseInt(str(formData, key), 10);
  return Number.isFinite(n) ? n : fallback;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length <= 100;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/** Build a redirect target with a flash message. */
export function withFlash(path: string, kind: "ok" | "err", message: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${kind}=${encodeURIComponent(message)}`;
}
