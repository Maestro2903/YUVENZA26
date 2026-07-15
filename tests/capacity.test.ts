import { describe, expect, it } from "vitest";
import { findSoldOut, isSoldOut, remainingSlots, slotsLabel } from "@/lib/events/capacity";
import type { EventItem } from "@/lib/content/types";

function ev(slug: string, capacity?: number, slots?: string): EventItem {
  return {
    slug,
    title: slug,
    category: "t",
    dateLabel: "d",
    price: 100,
    description: "d",
    capacity,
    slots,
  };
}

describe("remainingSlots / isSoldOut", () => {
  it("computes remaining against the live count", () => {
    expect(remainingSlots(ev("a", 120), 97)).toBe(23);
    expect(remainingSlots(ev("a", 120), 0)).toBe(120);
    expect(remainingSlots(ev("a", 120), undefined)).toBe(120);
  });

  it("never goes negative and clamps bad counts", () => {
    expect(remainingSlots(ev("a", 10), 15)).toBe(0);
    expect(remainingSlots(ev("a", 10), -5)).toBe(10);
  });

  it("unlimited events (no capacity) never sell out", () => {
    expect(remainingSlots(ev("a"), 9999)).toBeNull();
    expect(isSoldOut(ev("a"), 9999)).toBe(false);
  });

  it("sold out exactly at capacity", () => {
    expect(isSoldOut(ev("a", 10), 9)).toBe(false);
    expect(isSoldOut(ev("a", 10), 10)).toBe(true);
    expect(isSoldOut(ev("a", 0), 0)).toBe(true); // zero-capacity = closed
  });
});

describe("findSoldOut (checkout guard)", () => {
  it("returns the first full event in a selection", () => {
    const events = [ev("open"), ev("fine", 100), ev("full", 10)];
    expect(findSoldOut(events, { fine: 50, full: 10 })?.slug).toBe("full");
    expect(findSoldOut(events, { fine: 50, full: 9 })).toBeNull();
  });
});

describe("slotsLabel (remaining / total display)", () => {
  it("shows live remaining out of total", () => {
    expect(slotsLabel(ev("a", 120), 97)).toBe("23 / 120 slots left");
    expect(slotsLabel(ev("a", 120), undefined)).toBe("120 / 120 slots left");
  });

  it("shows sold out with the total", () => {
    expect(slotsLabel(ev("a", 120), 120)).toBe("Sold out · 0 / 120");
  });

  it("falls back to the free-text label when unlimited", () => {
    expect(slotsLabel(ev("a", undefined, "Open entry"), 5)).toBe("Open entry");
    expect(slotsLabel(ev("a"), 5)).toBe("");
  });
});
