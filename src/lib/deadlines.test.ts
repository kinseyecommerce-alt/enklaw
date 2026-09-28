import { describe, expect, it } from "vitest";
import { computeDeadline, federalHolidays } from "./deadlines";

describe("federalHolidays", () => {
  it("includes observed and floating holidays", () => {
    const h = federalHolidays(2026);
    expect(h.has("2026-01-19")).toBe(true); // MLK
    expect(h.has("2026-07-03")).toBe(true); // July 4 is Saturday → observed Friday
    expect(h.has("2026-11-26")).toBe(true); // Thanksgiving
    expect(h.has("2026-05-25")).toBe(true); // Memorial Day
  });
});

describe("computeDeadline", () => {
  it("counts calendar days and rolls a weekend forward", () => {
    // 2026-09-05 (Sat) + 21 = 2026-09-26 (Sat) → Monday 09-28
    expect(computeDeadline("2026-09-05", { mode: "calendar", days: 21 }).date).toBe("2026-09-28");
  });

  it("rolls past a holiday", () => {
    // 2026-08-08 + 30 = 2026-09-07 (Labor Day) → 09-08
    expect(computeDeadline("2026-08-08", { mode: "calendar", days: 30 }).date).toBe("2026-09-08");
  });

  it("counts court days", () => {
    // From Fri 2026-09-25, 10 court days → Fri 2026-10-09 (Columbus Day is 10-12)
    expect(computeDeadline("2026-09-25", { mode: "court", days: 10 }).date).toBe("2026-10-09");
  });

  it("counts backward and rolls backward", () => {
    // 9 court days before Mon 2026-10-19: skips 10-12 holiday → 2026-10-05
    expect(computeDeadline("2026-10-19", { mode: "court", days: -9 }).date).toBe("2026-10-05");
  });

  it("adds service days", () => {
    // 2026-09-01 + 30 + 3 = 2026-10-04 (Sun) → 10-05
    expect(computeDeadline("2026-09-01", { mode: "calendar", days: 30, serviceDays: 3 }).date).toBe("2026-10-05");
  });
});
