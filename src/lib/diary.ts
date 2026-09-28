import type { Case, Hearing } from "./types";
import { todayISO } from "./dates";

/** The next hearing still to happen (or still to be updated), if any. */
export function nextHearing(c: Case, today = todayISO()): Hearing | undefined {
  return [...c.hearings].filter((h) => !h.outcome && h.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
}

/** Past hearings whose outcome was never recorded. */
export const notUpdated = (c: Case, today = todayISO()) => c.hearings.filter((h) => !h.outcome && h.date < today);

export const lastHearing = (c: Case) =>
  [...c.hearings].filter((h) => h.outcome).sort((a, b) => b.date.localeCompare(a.date))[0];

export interface Listing {
  c: Case;
  h: Hearing;
}

export function causeList(cases: Case[], date: string): Listing[] {
  return cases
    .flatMap((c) => c.hearings.filter((h) => h.date === date).map((h) => ({ c, h })))
    .sort((a, b) => (a.c.court ?? "").localeCompare(b.c.court ?? "") || (Number(a.h.itemNo) || 9999) - (Number(b.h.itemNo) || 9999));
}

/** Pending cases with no upcoming or un-updated hearing: next date not yet known. */
export const dateAwaited = (cases: Case[], today = todayISO()) =>
  cases.filter((c) => c.status !== "disposed" && !c.hearings.some((h) => !h.outcome) && !nextHearing(c, today));

export interface HearingUpdate {
  outcome: string;
  nextDate?: string;
  nextPurpose?: string;
  disposed?: boolean;
}

/**
 * Records what happened at a hearing and, when a next date is given, lists the case
 * on that date (carrying over court hall and judge). Marks the case disposed if asked.
 */
export function recordHearing(c: Case, hearingId: string, u: HearingUpdate, newId: () => string): Case {
  const h = c.hearings.find((x) => x.id === hearingId);
  if (!h) return c;
  let hearings = c.hearings.map((x) => (x.id === hearingId ? { ...x, outcome: u.outcome.trim() || "Updated", nextDate: u.nextDate || undefined } : x));
  if (u.nextDate && !u.disposed && !hearings.some((x) => x.date === u.nextDate && !x.outcome)) {
    hearings = [...hearings, { id: newId(), date: u.nextDate, purpose: u.nextPurpose || h.purpose, courtHall: h.courtHall, judge: h.judge }];
  }
  return {
    ...c,
    hearings,
    stage: u.nextPurpose || c.stage,
    ...(u.disposed ? { status: "disposed" as const, disposalDate: h.date, disposalNature: u.outcome } : {}),
  };
}
