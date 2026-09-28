import { describe, expect, it } from "vitest";
import { addMonths, computeLimitation, isCourtClosed, parseClosures } from "./limitation";
import { fromISO } from "./dates";

const open = { saturdays: "none" as const, closures: [] };

describe("addMonths", () => {
  it("keeps the same date and clamps short months", () => {
    expect(addMonths("2026-01-15", 3)).toBe("2026-04-15");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-02-29", 12)).toBe("2025-02-28");
  });
});

describe("computeLimitation", () => {
  it("counts days excluding the first day", () => {
    // 90 days from 2026-01-01 → 2026-04-01 (Wednesday)
    expect(computeLimitation({ from: "2026-01-01", period: 90, unit: "days", calendar: open }).lastDay).toBe("2026-04-01");
  });

  it("moves to the next open day when the court is closed (s.4)", () => {
    // 30 days from 2026-09-02 → 2026-10-02 (Gandhi Jayanti, Friday) → Sat 10-03 closed (all Saturdays) → Sun → Mon 10-05
    const r = computeLimitation({ from: "2026-09-02", period: 30, unit: "days", calendar: { saturdays: "all", closures: [] } });
    expect(r.lastDay).toBe("2026-10-05");
  });

  it("excludes time taken for the certified copy (s.12)", () => {
    // 30 days from 2026-03-02 → 04-01; copy applied 03-03, ready 03-12 = 10 days → 04-11 (Sat) → 04-13 Mon when Saturdays closed
    const r = computeLimitation({
      from: "2026-03-02",
      period: 30,
      unit: "days",
      copyApplied: "2026-03-03",
      copyReady: "2026-03-12",
      calendar: { saturdays: "all", closures: [] },
    });
    expect(r.excludedDays).toBe(10);
    expect(r.lastDay).toBe("2026-04-13");
  });

  it("honours vacation ranges", () => {
    const r = computeLimitation({ from: "2026-05-01", period: 30, unit: "days", calendar: { saturdays: "none", closures: ["2026-05-25 to 2026-06-30"] } });
    expect(r.lastDay).toBe("2026-07-01");
  });
});

describe("court calendar", () => {
  it("handles 2nd and 4th Saturdays", () => {
    const cal = { saturdays: "2nd4th" as const, closures: [] };
    const none = new Set<string>();
    expect(isCourtClosed(fromISO("2026-09-12"), cal, none).closed).toBe(true); // 2nd Sat
    expect(isCourtClosed(fromISO("2026-09-19"), cal, none).closed).toBe(false); // 3rd Sat
    expect(isCourtClosed(fromISO("2026-09-26"), cal, none).closed).toBe(true); // 4th Sat
  });

  it("parses single dates and ranges", () => {
    expect(parseClosures(["2026-11-08", "2026-12-25 to 2026-12-27", "junk"]).size).toBe(4);
  });
});
