/**
 * Signed QR entry passes.
 *
 * Payload format: "YUV26|v1|<order-id>|<signature>"
 * The signature is HMAC-SHA256 over "v1|<order-id>" with a key derived from
 * APP_ENCRYPTION_KEY, truncated to 16 bytes (base64url). Only the server can
 * produce it - a QR generated anywhere else fails verification. Name and
 * events are NOT trusted from the QR: verification looks the order up in the
 * database, so a pass only ever proves "this exact paid order".
 *
 * Pure functions (key passed in) for unit testing; deriveTicketKey binds the
 * key to APP_ENCRYPTION_KEY so no extra secret needs managing.
 */
import crypto from "node:crypto";
import { parseEncryptionKey } from "@/lib/security/crypto";

export const TICKET_PREFIX = "YUV26";
export const TICKET_VERSION = "v1";
const SIG_BYTES = 16;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Derive the dedicated ticket-signing key from the app encryption key. */
export function deriveTicketKey(appEncryptionKeyRaw: string): Buffer {
  const master = parseEncryptionKey(appEncryptionKeyRaw);
  return crypto.createHmac("sha256", master).update("yuvenza-qr-ticket-v1").digest();
}

function signature(orderId: string, key: Buffer): string {
  return crypto
    .createHmac("sha256", key)
    .update(`${TICKET_VERSION}|${orderId.toLowerCase()}`)
    .digest()
    .subarray(0, SIG_BYTES)
    .toString("base64url");
}

/** Build the signed QR payload for a (paid) order. */
export function buildTicketPayload(orderId: string, key: Buffer): string {
  if (!UUID_RE.test(orderId)) throw new Error("Ticket order id must be a UUID");
  return `${TICKET_PREFIX}|${TICKET_VERSION}|${orderId.toLowerCase()}|${signature(orderId, key)}`;
}

export type TicketVerification =
  | { valid: true; orderId: string }
  | { valid: false; reason: "format" | "version" | "signature" };

/** Verify a scanned payload. Constant-time signature comparison. */
export function verifyTicketPayload(payload: string, key: Buffer): TicketVerification {
  const parts = payload.trim().split("|");
  if (parts.length !== 4 || parts[0] !== TICKET_PREFIX) {
    return { valid: false, reason: "format" };
  }
  const [, version, orderId, sig] = parts;
  if (version !== TICKET_VERSION) return { valid: false, reason: "version" };
  if (!UUID_RE.test(orderId)) return { valid: false, reason: "format" };

  const expected = Buffer.from(signature(orderId, key), "base64url");
  let actual: Buffer;
  try {
    actual = Buffer.from(sig, "base64url");
  } catch {
    return { valid: false, reason: "format" };
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(expected, actual)) {
    return { valid: false, reason: "signature" };
  }
  return { valid: true, orderId: orderId.toLowerCase() };
}
