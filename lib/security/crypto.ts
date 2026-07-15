/**
 * AES-256-GCM encryption for secrets stored at rest (Razorpay credentials
 * saved through the admin panel live in the `app_secrets` table as ciphertext).
 *
 * Key: APP_ENCRYPTION_KEY - 32 bytes, base64 or hex encoded.
 * Format: "enc:v1:" + base64(iv[12] + authTag[16] + ciphertext)
 *
 * Pure functions (key passed in) so they are unit-testable; the *WithAppKey
 * variants read the key from the environment.
 */
import crypto from "node:crypto";
import { getAppEncryptionKey } from "@/lib/env";

const PREFIX = "enc:v1:";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/** Parse a 32-byte key from base64 or hex. Throws on anything else. */
export function parseEncryptionKey(raw: string): Buffer {
  const trimmed = raw.trim();
  let key: Buffer | null = null;
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    key = Buffer.from(trimmed, "hex");
  } else {
    try {
      const b = Buffer.from(trimmed, "base64");
      if (b.length === 32) key = b;
    } catch {
      key = null;
    }
  }
  if (!key || key.length !== 32) {
    throw new Error(
      "APP_ENCRYPTION_KEY must be 32 bytes, base64 or hex encoded. Generate one with: openssl rand -base64 32"
    );
  }
  return key;
}

export function encryptSecret(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptSecret(payload: string, key: Buffer): string {
  if (!payload.startsWith(PREFIX)) {
    throw new Error("Unrecognised secret format");
  }
  const raw = Buffer.from(payload.slice(PREFIX.length), "base64");
  if (raw.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("Corrupt secret payload");
  }
  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function isEncryptionConfigured(): boolean {
  const raw = getAppEncryptionKey();
  if (!raw) return false;
  try {
    parseEncryptionKey(raw);
    return true;
  } catch {
    return false;
  }
}

function requireAppKey(): Buffer {
  const raw = getAppEncryptionKey();
  if (!raw) {
    throw new Error("APP_ENCRYPTION_KEY is not set - cannot encrypt/decrypt stored secrets.");
  }
  return parseEncryptionKey(raw);
}

export function encryptWithAppKey(plaintext: string): string {
  return encryptSecret(plaintext, requireAppKey());
}

export function decryptWithAppKey(payload: string): string {
  return decryptSecret(payload, requireAppKey());
}
