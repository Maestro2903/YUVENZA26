import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { buildTicketPayload, deriveTicketKey, verifyTicketPayload } from "@/lib/ticket";

const APP_KEY = crypto.randomBytes(32).toString("base64");
const KEY = deriveTicketKey(APP_KEY);
const ORDER_ID = "7f3e9d2a-1b4c-4e5f-8a6b-9c0d1e2f3a4b";

describe("signed QR entry passes", () => {
  it("builds a payload that verifies", () => {
    const payload = buildTicketPayload(ORDER_ID, KEY);
    expect(payload.startsWith("YUV26|v1|" + ORDER_ID)).toBe(true);
    const verdict = verifyTicketPayload(payload, KEY);
    expect(verdict).toEqual({ valid: true, orderId: ORDER_ID });
  });

  it("stays comfortably scannable (short payload)", () => {
    expect(buildTicketPayload(ORDER_ID, KEY).length).toBeLessThan(80);
  });

  it("rejects a forged payload (no key knowledge)", () => {
    const forged = `YUV26|v1|${ORDER_ID}|${Buffer.from("hack-attempt!").toString("base64url")}`;
    expect(verifyTicketPayload(forged, KEY).valid).toBe(false);
  });

  it("rejects a payload signed with a different key", () => {
    const otherKey = deriveTicketKey(crypto.randomBytes(32).toString("base64"));
    const payload = buildTicketPayload(ORDER_ID, otherKey);
    const verdict = verifyTicketPayload(payload, KEY);
    expect(verdict.valid).toBe(false);
    if (!verdict.valid) expect(verdict.reason).toBe("signature");
  });

  it("rejects order-id swaps (signature binds the id)", () => {
    const payload = buildTicketPayload(ORDER_ID, KEY);
    const otherId = "00000000-0000-4000-8000-000000000000";
    const swapped = payload.replace(ORDER_ID, otherId);
    expect(verifyTicketPayload(swapped, KEY).valid).toBe(false);
  });

  it("rejects garbage, wrong prefixes and wrong versions", () => {
    expect(verifyTicketPayload("", KEY).valid).toBe(false);
    expect(verifyTicketPayload("hello world", KEY).valid).toBe(false);
    expect(verifyTicketPayload(`EVIL|v1|${ORDER_ID}|abc`, KEY).valid).toBe(false);
    const v2 = buildTicketPayload(ORDER_ID, KEY).replace("|v1|", "|v9|");
    expect(verifyTicketPayload(v2, KEY).valid).toBe(false);
  });

  it("derives a stable key from the app secret (and never the raw secret)", () => {
    const again = deriveTicketKey(APP_KEY);
    expect(again.equals(KEY)).toBe(true);
    expect(KEY.toString("base64")).not.toBe(APP_KEY);
  });

  it("refuses to sign non-UUID order ids", () => {
    expect(() => buildTicketPayload("not-a-uuid", KEY)).toThrow();
  });
});
