import type { DocketDetail } from "./api";
import type { Case, DocketEntry, LinkedDocket } from "./types";
import { uid } from "./id";

export const entryKey = (e: DocketEntry) => `${e.entryNumber ?? ""}|${e.dateFiled ?? ""}|${e.description.slice(0, 80)}`;

/** Links (or re-syncs) a CourtListener docket to a case, filling in blank case details and missing parties. */
export function applyDocket(c: Case, d: DocketDetail): { next: Case; newEntries: number } {
  const prev = c.docket?.docketId === d.docketId ? c.docket : undefined;
  const seen = new Set(prev?.entries.map(entryKey) ?? []);
  const fresh = prev ? d.entries.filter((e) => !seen.has(entryKey(e))) : [];

  const linked: LinkedDocket = {
    docketId: d.docketId,
    url: d.url,
    caseName: d.caseName,
    court: d.court,
    courtId: d.courtId,
    docketNumber: d.docketNumber,
    dateFiled: d.dateFiled,
    dateTerminated: d.dateTerminated,
    judge: d.judge,
    cause: d.cause,
    natureOfSuit: d.natureOfSuit,
    entries: d.entries,
    entriesNote: d.entriesNote,
    lastSynced: new Date().toISOString(),
    newEntryKeys: fresh.map(entryKey),
    alertId: prev?.alertId,
  };

  const known = new Set(c.parties.map((p) => p.name.trim().toLowerCase()));
  const parties = [
    ...c.parties,
    ...d.partyDetails
      .filter((p) => p.name && !known.has(p.name.trim().toLowerCase()))
      .map((p) => ({ id: uid(), name: p.name, role: p.types.join(", "), attorney: p.attorneys.join("; "), contact: "" })),
  ];

  const timeline =
    d.dateFiled && !prev && !c.timeline.some((t) => t.title === "Case filed" && t.date === d.dateFiled)
      ? [...c.timeline, { id: uid(), date: d.dateFiled, title: "Case filed", description: `${d.caseName} filed in ${d.court}`, evidenceIds: [] }]
      : c.timeline;

  return {
    next: {
      ...c,
      title: c.title === "Untitled case" ? d.caseName : c.title,
      caseNumber: c.caseNumber || d.docketNumber,
      court: c.court || d.court,
      judge: c.judge || d.judge,
      parties,
      timeline,
      docket: linked,
    },
    newEntries: fresh.length,
  };
}
