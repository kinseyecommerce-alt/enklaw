import { describe, expect, it } from "vitest";
import { causeList, dateAwaited, nextHearing, notUpdated, recordHearing } from "./diary";
import type { Case } from "./types";

const mk = (id: string, hearings: Case["hearings"], extra: Partial<Case> = {}): Case => ({
  id,
  title: id,
  courtType: "HC",
  side: "Petitioner",
  status: "pending",
  client: {},
  createdAt: "",
  parties: [],
  hearings,
  orders: [],
  tasks: [],
  annexures: [],
  timeline: [],
  drafts: [],
  notes: [],
  chat: [],
  ...extra,
});

const today = "2026-09-28";

describe("diary", () => {
  const a = mk("a", [
    { id: "1", date: "2026-09-01", outcome: "Notice issued", nextDate: "2026-09-28" },
    { id: "2", date: "2026-09-28", itemNo: "12" },
  ]);
  const b = mk("b", [{ id: "3", date: "2026-09-20" }]);
  const c = mk("c", [{ id: "4", date: "2026-09-10", outcome: "Adjourned sine die" }]);
  const d = mk("d", [], { status: "disposed" });

  it("finds the next hearing and un-updated ones", () => {
    expect(nextHearing(a, today)?.id).toBe("2");
    expect(notUpdated(b, today).map((h) => h.id)).toEqual(["3"]);
  });

  it("builds a cause list and a date-awaited list", () => {
    expect(causeList([a, b, c], today).map((l) => l.c.id)).toEqual(["a"]);
    expect(dateAwaited([a, b, c, d], today).map((x) => x.id)).toEqual(["c"]);
  });
});

describe("recordHearing", () => {
  const base = mk("x", [{ id: "h1", date: "2026-09-28", purpose: "Admission", courtHall: "12", itemNo: "5" }]);
  let n = 0;
  const id = () => `n${++n}`;

  it("records the outcome and lists the next date", () => {
    const c = recordHearing(base, "h1", { outcome: "Notice issued", nextDate: "2026-11-02", nextPurpose: "Reply" }, id);
    expect(c.hearings).toHaveLength(2);
    expect(c.hearings[0].outcome).toBe("Notice issued");
    expect(c.hearings[1]).toMatchObject({ date: "2026-11-02", purpose: "Reply", courtHall: "12" });
    expect(c.stage).toBe("Reply");
    expect(nextHearing(c, today)?.date).toBe("2026-11-02");
  });

  it("marks the case disposed without listing it again", () => {
    const c = recordHearing(base, "h1", { outcome: "Dismissed as withdrawn", nextDate: "2026-11-02", disposed: true }, id);
    expect(c.hearings).toHaveLength(1);
    expect(c.status).toBe("disposed");
    expect(c.disposalDate).toBe("2026-09-28");
  });
});
