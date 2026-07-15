import { describe, expect, it } from "vitest";
import { validateCheckout } from "@/lib/checkout";
import type { EventItem } from "@/lib/content/types";

const CATALOG: EventItem[] = [
  { slug: "hackathon", title: "Hackathon", category: "Tech", dateLabel: "Aug 11", price: 299, description: "d" },
  { slug: "debate", title: "Debate", category: "Literary", dateLabel: "Aug 12", price: 0, description: "d" },
  { slug: "run", title: "Run", category: "Fundraiser", dateLabel: "Aug 13", price: 249, description: "d" },
];

const VALID = {
  name: "Asha Kumar",
  email: "Asha@Example.com",
  phone: "9876543210",
  college: "CIT",
  eventSlugs: ["hackathon", "run"],
};

describe("validateCheckout", () => {
  it("accepts a valid checkout and computes the total server-side", () => {
    const result = validateCheckout(VALID, CATALOG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalRupees).toBe(548);
    expect(result.value.totalPaise).toBe(54800);
    expect(result.value.email).toBe("asha@example.com"); // normalised
    expect(result.value.events.map((e) => e.slug)).toEqual(["hackathon", "run"]);
  });

  it("treats free-only selections as zero total", () => {
    const result = validateCheckout({ ...VALID, eventSlugs: ["debate"] }, CATALOG);
    expect(result.ok && result.value.totalPaise === 0).toBe(true);
  });

  it("de-duplicates repeated slugs so nobody is double-charged", () => {
    const result = validateCheckout(
      { ...VALID, eventSlugs: ["hackathon", "hackathon", "hackathon"] },
      CATALOG
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalRupees).toBe(299);
    expect(result.value.events).toHaveLength(1);
  });

  it("rejects unknown events (price cannot be spoofed)", () => {
    const result = validateCheckout({ ...VALID, eventSlugs: ["hackathon", "fake-event"] }, CATALOG);
    expect(result.ok).toBe(false);
  });

  it("rejects an empty selection", () => {
    expect(validateCheckout({ ...VALID, eventSlugs: [] }, CATALOG).ok).toBe(false);
  });

  it("validates contact fields", () => {
    expect(validateCheckout({ ...VALID, name: "A" }, CATALOG).ok).toBe(false);
    expect(validateCheckout({ ...VALID, email: "not-an-email" }, CATALOG).ok).toBe(false);
    expect(validateCheckout({ ...VALID, phone: "12345" }, CATALOG).ok).toBe(false);
    expect(validateCheckout({ ...VALID, phone: "98765 43210" }, CATALOG).ok).toBe(true); // spaces stripped
  });

  it("rejects garbage bodies", () => {
    expect(validateCheckout(null, CATALOG).ok).toBe(false);
    expect(validateCheckout("string", CATALOG).ok).toBe(false);
    expect(validateCheckout({ eventSlugs: [123] }, CATALOG).ok).toBe(false);
  });
});
