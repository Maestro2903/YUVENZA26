import { describe, expect, it } from "vitest";
import { eventsClash, findClash, findClashesWithin, formatTimeRange, getEventSpan } from "@/lib/events/clash";
import { validateCheckout } from "@/lib/checkout";
import type { EventItem } from "@/lib/content/types";

function ev(slug: string, date?: string, start?: string, end?: string): EventItem {
  return {
    slug,
    title: slug,
    category: "t",
    dateLabel: "d",
    eventDate: date,
    startTime: start,
    endTime: end,
    price: 100,
    description: "d",
  };
}

describe("event time clash", () => {
  const morning = ev("a", "2026-08-11", "10:00", "13:00");
  const overlap = ev("b", "2026-08-11", "12:00", "15:00");
  const afternoon = ev("c", "2026-08-11", "14:00", "17:00");
  const otherDay = ev("d", "2026-08-12", "10:00", "13:00");
  const open = ev("e", "2026-08-11"); // no times = open format

  it("detects overlapping ranges on the same day", () => {
    expect(eventsClash(morning, overlap)).toBe(true);
    expect(eventsClash(overlap, afternoon)).toBe(true);
  });

  it("back-to-back events do not clash", () => {
    expect(eventsClash(morning, afternoon)).toBe(false); // 13:00 end, 14:00 start
    expect(eventsClash(ev("x", "2026-08-11", "13:00", "14:00"), morning)).toBe(false);
  });

  it("different days never clash", () => {
    expect(eventsClash(morning, otherDay)).toBe(false);
  });

  it("open-format events (no times) never clash", () => {
    expect(eventsClash(morning, open)).toBe(false);
    expect(getEventSpan(open)).toBeNull();
  });

  it("invalid ranges are treated as open", () => {
    expect(getEventSpan(ev("x", "2026-08-11", "15:00", "12:00"))).toBeNull();
    expect(getEventSpan(ev("x", "2026-08-11", "25:99", "26:00"))).toBeNull();
  });

  it("findClash returns the blocking event", () => {
    expect(findClash(overlap, [morning, otherDay])?.slug).toBe("a");
    expect(findClash(afternoon, [morning])).toBeNull();
  });

  it("findClashesWithin reports every clashing pair", () => {
    expect(findClashesWithin([morning, overlap, afternoon])).toHaveLength(2);
    expect(findClashesWithin([morning, afternoon, otherDay, open])).toHaveLength(0);
  });

  it("formats time ranges for display", () => {
    expect(formatTimeRange("10:00", "13:30")).toBe("10:00 AM – 1:30 PM");
    expect(formatTimeRange("00:05", "12:00")).toBe("12:05 AM – 12:00 PM");
    expect(formatTimeRange(undefined, "12:00")).toBeNull();
  });
});

describe("checkout rejects clashing selections server-side", () => {
  const catalog = [
    ev("a", "2026-08-11", "10:00", "13:00"),
    ev("b", "2026-08-11", "12:00", "15:00"),
    ev("c", "2026-08-12", "10:00", "13:00"),
  ];
  const base = { name: "Asha Kumar", email: "a@citchennai.net", phone: "9876543210", college: "" };

  it("blocks a clashing pair even if the UI is bypassed", () => {
    const result = validateCheckout({ ...base, eventSlugs: ["a", "b"] }, catalog);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/same time/);
  });

  it("allows non-clashing selections", () => {
    expect(validateCheckout({ ...base, eventSlugs: ["a", "c"] }, catalog).ok).toBe(true);
  });
});
