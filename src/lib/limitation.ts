// Limitation period arithmetic under the Limitation Act, 1963 and the General Clauses Act, 1897.
// Results are estimates — the user must confirm the applicable Article / rule and court calendar.
import { fromISO, toISO } from "./dates";

export type Unit = "days" | "months" | "years";

export interface CourtCalendar {
  /** "none": only Sundays closed; "all": every Saturday; "2nd4th": 2nd and 4th Saturdays. */
  saturdays: "none" | "all" | "2nd4th";
  /** Extra closed dates (YYYY-MM-DD) and ranges ("YYYY-MM-DD to YYYY-MM-DD") for holidays and vacations. */
  closures: string[];
}

/** National holidays observed by every court. Other gazetted holidays vary by year and state — add them as closures. */
const NATIONAL = ["01-26", "08-15", "10-02"];

export function parseClosures(lines: string[]): Set<string> {
  const out = new Set<string>();
  for (const raw of lines) {
    const m = raw.trim().match(/^(\d{4}-\d{2}-\d{2})(?:\s*(?:to|-|–)\s*(\d{4}-\d{2}-\d{2}))?$/);
    if (!m) continue;
    const start = fromISO(m[1]);
    const end = fromISO(m[2] ?? m[1]);
    for (let d = start; d <= end && out.size < 5000; d.setDate(d.getDate() + 1)) out.add(toISO(d));
  }
  return out;
}

export function isCourtClosed(d: Date, cal: CourtCalendar, closures: Set<string>): { closed: boolean; why?: string } {
  if (d.getDay() === 0) return { closed: true, why: "Sunday" };
  if (d.getDay() === 6) {
    const nth = Math.ceil(d.getDate() / 7);
    if (cal.saturdays === "all") return { closed: true, why: "Saturday" };
    if (cal.saturdays === "2nd4th" && (nth === 2 || nth === 4)) return { closed: true, why: `${nth === 2 ? "2nd" : "4th"} Saturday` };
  }
  const iso = toISO(d);
  if (NATIONAL.includes(iso.slice(5))) return { closed: true, why: "national holiday" };
  if (closures.has(iso)) return { closed: true, why: "court holiday / vacation" };
  return { closed: false };
}

/** Adds calendar months per General Clauses Act s.3(35); clamps to the last day of shorter months. */
export function addMonths(iso: string, months: number): string {
  const d = fromISO(iso);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, last));
  return toISO(target);
}

export interface LimitationInput {
  /** Date from which the period runs (date of judgment/order, service, cause of action…). */
  from: string;
  period: number;
  unit: Unit;
  /** Certified copy: date applied and date it was ready (s.12(2)/(3)). Both optional. */
  copyApplied?: string;
  copyReady?: string;
  calendar: CourtCalendar;
}

export interface LimitationResult {
  lastDay: string;
  steps: string[];
  excludedDays: number;
}

export function computeLimitation(input: LimitationInput): LimitationResult {
  const steps: string[] = [];
  steps.push(`Period runs from ${input.from}; that day itself is excluded (s.12(1)).`);

  let end: string;
  if (input.unit === "days") {
    const d = fromISO(input.from);
    d.setDate(d.getDate() + input.period);
    end = toISO(d);
  } else {
    end = addMonths(input.from, input.unit === "months" ? input.period : input.period * 12);
  }
  steps.push(`${input.period} ${input.unit} → period expires on ${end}.`);

  let excluded = 0;
  if (input.copyApplied && input.copyReady && input.copyReady >= input.copyApplied) {
    // Time requisite for obtaining the copy: from the application date to the date the copy was ready,
    // counting the day of application (a day already inside the period) and the day it was ready.
    excluded = Math.round((fromISO(input.copyReady).getTime() - fromISO(input.copyApplied).getTime()) / 86_400_000) + 1;
    const d = fromISO(end);
    d.setDate(d.getDate() + excluded);
    end = toISO(d);
    steps.push(`Exclude ${excluded} day(s) taken to obtain the certified copy (${input.copyApplied} to ${input.copyReady}, s.12(2)) → ${end}.`);
  }

  const closures = parseClosures(input.calendar.closures);
  const d = fromISO(end);
  const skipped: string[] = [];
  for (let guard = 0; guard < 400; guard++) {
    const c = isCourtClosed(d, input.calendar, closures);
    if (!c.closed) break;
    skipped.push(`${toISO(d)} (${c.why})`);
    d.setDate(d.getDate() + 1);
  }
  if (skipped.length) steps.push(`Court closed on ${skipped.join(", ")} → may be filed on the reopening day, ${toISO(d)} (s.4).`);

  return { lastDay: toISO(d), steps, excludedDays: excluded };
}

export interface Preset {
  group: string;
  label: string;
  period: number;
  unit: Unit;
  note: string;
}

/** Commonly used periods. Always verify against the current statute, rules and any special law. */
export const PRESETS: Preset[] = [
  { group: "Supreme Court", label: "SLP against High Court judgment / order", period: 90, unit: "days", note: "Supreme Court Rules, 2013 — from the date of the judgment or order." },
  { group: "Supreme Court", label: "SLP against order refusing certificate of fitness", period: 60, unit: "days", note: "Supreme Court Rules, 2013 — from the order refusing the certificate." },
  { group: "Supreme Court", label: "Review petition in the Supreme Court", period: 30, unit: "days", note: "Supreme Court Rules, 2013, Order XLVII — from the judgment or order." },
  { group: "Civil", label: "Appeal to High Court from decree / order", period: 90, unit: "days", note: "Limitation Act, Art. 116(a) — from the date of the decree or order." },
  { group: "Civil", label: "Appeal to any other court from decree / order", period: 30, unit: "days", note: "Limitation Act, Art. 116(b)." },
  { group: "Civil", label: "Letters Patent / intra-court appeal", period: 30, unit: "days", note: "Limitation Act, Art. 117 — check the High Court's rules." },
  { group: "Civil", label: "Review of judgment (CPC O.47)", period: 30, unit: "days", note: "Limitation Act, Art. 124." },
  { group: "Civil", label: "Written statement (CPC O.VIII r.1)", period: 30, unit: "days", note: "From service of summons; extendable up to 90 days. Commercial suits: 120 days is a hard limit." },
  { group: "Civil", label: "Set aside ex-parte decree (CPC O.IX r.13)", period: 30, unit: "days", note: "Limitation Act, Art. 123 — from the decree, or from knowledge if summons was not duly served." },
  { group: "Civil", label: "Suit on contract / money (general)", period: 3, unit: "years", note: "Limitation Act, Arts. 55 / 113 — from breach or when the right to sue accrues." },
  { group: "Civil", label: "Execution of a decree", period: 12, unit: "years", note: "Limitation Act, Art. 136 — from when the decree becomes enforceable." },
  { group: "Criminal", label: "Appeal to High Court against conviction", period: 60, unit: "days", note: "Limitation Act, Art. 115(b)(i) — from the date of sentence or order." },
  { group: "Criminal", label: "Appeal to Sessions Court against conviction", period: 30, unit: "days", note: "Limitation Act, Art. 115(b)(ii)." },
  { group: "Criminal", label: "Appeal by State against acquittal", period: 90, unit: "days", note: "Limitation Act, Art. 114(a)." },
  { group: "Criminal", label: "Criminal revision", period: 90, unit: "days", note: "Limitation Act, Art. 131 — from the order sought to be revised." },
  { group: "Cheque bounce (NI Act)", label: "Send demand notice after dishonour", period: 30, unit: "days", note: "S.138(b) NI Act — from receiving the bank's return memo." },
  { group: "Cheque bounce (NI Act)", label: "File complaint", period: 1, unit: "months", note: "S.142(1)(b) NI Act — start from the day the drawer's 15-day payment period expired." },
  { group: "Arbitration", label: "Petition to set aside award (S.34)", period: 3, unit: "months", note: "Arbitration Act S.34(3) — from receipt of the award; court may condone up to 30 more days." },
  { group: "Consumer", label: "Consumer complaint", period: 2, unit: "years", note: "Consumer Protection Act 2019, S.69 — from the cause of action." },
  { group: "Consumer", label: "Appeal to State Commission", period: 45, unit: "days", note: "Consumer Protection Act 2019, S.41 — from the District Commission's order." },
  { group: "Consumer", label: "Appeal to National Commission", period: 30, unit: "days", note: "Consumer Protection Act 2019, S.51 — from the State Commission's order." },
  { group: "Consumer", label: "Appeal to Supreme Court from NCDRC", period: 30, unit: "days", note: "Consumer Protection Act 2019, S.67." },
  { group: "Company / IBC", label: "Appeal to NCLAT (IBC S.61)", period: 30, unit: "days", note: "IBC S.61(2) — NCLAT may allow 15 more days for sufficient cause." },
  { group: "Company / IBC", label: "Appeal to NCLAT (Companies Act S.421)", period: 45, unit: "days", note: "Companies Act S.421(3) — from receipt of the NCLT order; up to 45 more days on sufficient cause." },
  { group: "Company / IBC", label: "Appeal to Supreme Court from NCLAT (IBC S.62)", period: 45, unit: "days", note: "IBC S.62 — up to 15 more days on sufficient cause." },
  { group: "Tribunals", label: "Original Application before CAT", period: 1, unit: "years", note: "Administrative Tribunals Act S.21 — from the final order." },
  { group: "Tribunals", label: "SARFAESI application to DRT (S.17)", period: 45, unit: "days", note: "SARFAESI Act S.17(1) — from the date of the measure taken." },
  { group: "Tribunals", label: "Appeal to DRAT (RDB Act S.20)", period: 30, unit: "days", note: "RDB Act S.20(3) — from receipt of the DRT order." },
];
