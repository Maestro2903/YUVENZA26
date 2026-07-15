import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import {
  decryptSecret,
  encryptSecret,
  parseEncryptionKey,
} from "@/lib/security/crypto";

const KEY = crypto.randomBytes(32);

describe("secret encryption (AES-256-GCM)", () => {
  it("round-trips plaintext", () => {
    const secret = "rzp_live_secret_abc123!@#₹";
    const encrypted = encryptSecret(secret, KEY);
    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toContain(secret);
    expect(decryptSecret(encrypted, KEY)).toBe(secret);
  });

  it("produces a different ciphertext each time (fresh IV)", () => {
    const a = encryptSecret("same-value", KEY);
    const b = encryptSecret("same-value", KEY);
    expect(a).not.toBe(b);
    expect(decryptSecret(a, KEY)).toBe(decryptSecret(b, KEY));
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptSecret("secret", KEY);
    const raw = Buffer.from(encrypted.slice("enc:v1:".length), "base64");
    raw[raw.length - 1] ^= 0xff; // flip a ciphertext bit
    const tampered = "enc:v1:" + raw.toString("base64");
    expect(() => decryptSecret(tampered, KEY)).toThrow();
  });

  it("rejects the wrong key", () => {
    const encrypted = encryptSecret("secret", KEY);
    expect(() => decryptSecret(encrypted, crypto.randomBytes(32))).toThrow();
  });

  it("rejects unknown formats", () => {
    expect(() => decryptSecret("plaintext-not-encrypted", KEY)).toThrow(/format/i);
    expect(() => decryptSecret("enc:v1:dG9vc2hvcnQ=", KEY)).toThrow();
  });

  it("parses base64 and hex keys, rejects bad keys", () => {
    expect(parseEncryptionKey(KEY.toString("base64")).equals(KEY)).toBe(true);
    expect(parseEncryptionKey(KEY.toString("hex")).equals(KEY)).toBe(true);
    expect(() => parseEncryptionKey("too-short")).toThrow();
    expect(() => parseEncryptionKey(crypto.randomBytes(16).toString("base64"))).toThrow();
  });
});
