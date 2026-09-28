import { describe, expect, it } from "vitest";
import { applyDocket } from "./docket";
import type { DocketDetail } from "./api";
import type { Case } from "./types";

const baseCase = (): Case => ({
  id: "c1",
  title: "Untitled case",
  myRole: "Plaintiff",
  status: "active",
  createdAt: "2026-01-01T00:00:00Z",
  parties: [{ id: "p1", name: "Jane Doe", role: "Plaintiff" }],
  deadlines: [],
  evidence: [],
  timeline: [],
  drafts: [],
  notes: [],
  chat: [],
});

const detail = (entries: DocketDetail["entries"]): DocketDetail => ({
  docketId: 42,
  caseName: "Doe v. Acme",
  court: "District Court, N.D. California",
  courtId: "cand",
  docketNumber: "3:26-cv-00001",
  dateFiled: "2026-02-01",
  judge: "Judge Smith",
  parties: [],
  url: "https://www.courtlistener.com/docket/42/doe-v-acme/",
  entries,
  partyDetails: [
    { name: "JANE DOE", types: ["Plaintiff"], attorneys: [] },
    { name: "Acme Corp", types: ["Defendant"], attorneys: ["Big Law LLP"] },
  ],
});

const entry = (n: number, desc: string) => ({ entryNumber: n, dateFiled: `2026-02-0${n}`, description: desc, documents: [] });

describe("applyDocket", () => {
  it("fills blank case fields, adds missing parties and a filing event", () => {
    const { next, newEntries } = applyDocket(baseCase(), detail([entry(1, "COMPLAINT")]));
    expect(next.title).toBe("Doe v. Acme");
    expect(next.caseNumber).toBe("3:26-cv-00001");
    expect(next.judge).toBe("Judge Smith");
    expect(next.parties.map((p) => p.name)).toEqual(["Jane Doe", "Acme Corp"]);
    expect(next.parties[1].attorney).toBe("Big Law LLP");
    expect(next.timeline).toHaveLength(1);
    expect(newEntries).toBe(0);
  });

  it("keeps user-entered details and flags entries added since the last sync", () => {
    const first = applyDocket({ ...baseCase(), title: "My case", caseNumber: "mine" }, detail([entry(1, "COMPLAINT")])).next;
    const { next, newEntries } = applyDocket(first, detail([entry(2, "ANSWER"), entry(1, "COMPLAINT")]));
    expect(next.title).toBe("My case");
    expect(next.caseNumber).toBe("mine");
    expect(newEntries).toBe(1);
    expect(next.docket?.newEntryKeys).toHaveLength(1);
    expect(next.timeline).toHaveLength(1);
    expect(next.parties).toHaveLength(2);
  });
});
