import "server-only";

/**
 * Lightweight per-instance sliding-window rate limiter for the public APIs
 * (checkout, payment verify, ticket issuing). Zero dependencies and zero
 * added latency - it protects each server instance from bursts and abuse.
 *
 * Honest scaling note: on serverless platforms every warm instance has its
 * own window, so the effective global limit is (limit x instances). That is
 * fine as burst/abuse protection; if you ever need a strict global limit,
 * swap the store for Upstash Redis - the call sites stay identical.
 */

type Bucket = number[]; // request timestamps (ms), oldest first

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_KEYS) {
      // Drop the oldest key wholesale - cheap protection against key floods.
      const oldest = buckets.keys().next().value;
      if (oldest) buckets.delete(oldest);
    }
    bucket = [];
    buckets.set(key, bucket);
  }

  while (bucket.length > 0 && bucket[0] <= cutoff) bucket.shift();

  if (bucket.length >= limit) return false;
  bucket.push(now);
  return true;
}

/** Best-effort client identifier behind Vercel/CDN proxies. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function tooManyRequests(message = "Too many requests - please slow down and try again.") {
  return Response.json({ ok: false, error: message }, { status: 429 });
}
