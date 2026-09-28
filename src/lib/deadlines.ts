// Court deadline arithmetic. Rules vary by jurisdiction — results are estimates
// that the user must confirm against the applicable rules of court.

export const toISO = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const fromISO = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const nthWeekday = (year: number, month: number, weekday: number, n: number): Date => {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
};

const lastWeekday = (year: number, month: number, weekday: number): Date => {
  const last = new Date(year, month + 1, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month, last.getDate() - offset);
};

/** Fixed-date holidays move to Friday/Monday when they fall on a weekend (federal observance rule). */
const observed = (d: Date): Date => {
  if (d.getDay() === 6) return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  if (d.getDay() === 0) return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return d;
};

/** U.S. federal court holidays (FRCP 6(a)(6)) for a given year, as ISO dates. */
export function federalHolidays(year: number): Set<string> {
  const days = [
    observed(new Date(year, 0, 1)), // New Year's Day
    nthWeekday(year, 0, 1, 3), // MLK Day
    nthWeekday(year, 1, 1, 3), // Washington's Birthday
    lastWeekday(year, 4, 1), // Memorial Day
    observed(new Date(year, 5, 19)), // Juneteenth
    observed(new Date(year, 6, 4)), // Independence Day
    nthWeekday(year, 8, 1, 1), // Labor Day
    nthWeekday(year, 9, 1, 2), // Columbus Day
    observed(new Date(year, 10, 11)), // Veterans Day
    nthWeekday(year, 10, 4, 4), // Thanksgiving
    observed(new Date(year, 11, 25)), // Christmas
  ];
  // Next year's New Year's Day can be observed on Dec 31 of this year.
  const nextNewYear = observed(new Date(year + 1, 0, 1));
  if (nextNewYear.getFullYear() === year) days.push(nextNewYear);
  return new Set(days.map(toISO));
}

export function isHoliday(d: Date, extra: Set<string> = new Set()): boolean {
  const iso = toISO(d);
  return federalHolidays(d.getFullYear()).has(iso) || extra.has(iso);
}

export const isWeekend = (d: Date): boolean => d.getDay() === 0 || d.getDay() === 6;

export const isCourtDay = (d: Date, extra?: Set<string>): boolean => !isWeekend(d) && !isHoliday(d, extra);

export interface DeadlineOptions {
  /** Count calendar days (default) or only court days. */
  mode: "calendar" | "court";
  /** Negative for "N days before" (e.g. before a hearing). */
  days: number;
  /** Extra days added for service method (e.g. +3 for mail under FRCP 6(d), +5 in some state courts). */
  serviceDays?: number;
  /** Extra closure dates (local court holidays), ISO strings. */
  extraHolidays?: string[];
}

export interface DeadlineResult {
  date: string;
  steps: string[];
}

/**
 * Computes a deadline following the FRCP 6(a)(1) pattern: exclude the trigger day,
 * count every day (or every court day), and if the last day is a weekend or holiday
 * roll forward (or backward, when counting before an event) to the next court day.
 */
export function computeDeadline(trigger: string, opts: DeadlineOptions): DeadlineResult {
  const extra = new Set(opts.extraHolidays ?? []);
  const steps: string[] = [];
  const dir = opts.days < 0 ? -1 : 1;
  const total = Math.abs(opts.days);
  const d = fromISO(trigger);
  steps.push(`Trigger date: ${trigger} (not counted)`);

  if (opts.mode === "calendar") {
    d.setDate(d.getDate() + dir * total);
    steps.push(`${dir > 0 ? "Add" : "Subtract"} ${total} calendar day(s) → ${toISO(d)}`);
  } else {
    let counted = 0;
    while (counted < total) {
      d.setDate(d.getDate() + dir);
      if (isCourtDay(d, extra)) counted++;
    }
    steps.push(`${dir > 0 ? "Add" : "Subtract"} ${total} court day(s), skipping weekends/holidays → ${toISO(d)}`);
  }

  if (opts.serviceDays) {
    d.setDate(d.getDate() + opts.serviceDays);
    steps.push(`Add ${opts.serviceDays} day(s) for method of service → ${toISO(d)}`);
  }

  const before = toISO(d);
  while (!isCourtDay(d, extra)) d.setDate(d.getDate() + dir);
  if (toISO(d) !== before) {
    steps.push(`${before} is a weekend/holiday → move ${dir > 0 ? "forward" : "back"} to ${toISO(d)}`);
  }
  return { date: toISO(d), steps };
}

export function daysUntil(iso: string, today = new Date()): number {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((fromISO(iso).getTime() - t.getTime()) / 86_400_000);
}

/** Common presets. Always verify against your court's rules. */
export const PRESETS: { label: string; days: number; mode: "calendar" | "court"; note: string }[] = [
  { label: "Answer a federal complaint (FRCP 12(a))", days: 21, mode: "calendar", note: "21 days after service of summons & complaint." },
  { label: "Answer if service waived (FRCP 12(a)(1)(A)(ii))", days: 60, mode: "calendar", note: "60 days after the waiver request was sent." },
  { label: "Respond to discovery (FRCP 33/34/36)", days: 30, mode: "calendar", note: "30 days after service of the requests." },
  { label: "Federal notice of appeal (FRAP 4(a)(1)(A))", days: 30, mode: "calendar", note: "30 days after entry of judgment (60 if the U.S. is a party)." },
  { label: "Motion for new trial (FRCP 59)", days: 28, mode: "calendar", note: "28 days after entry of judgment." },
  { label: "California answer to complaint (CCP 412.20)", days: 30, mode: "calendar", note: "30 days after personal service." },
  { label: "California unlawful detainer answer (CCP 1167)", days: 10, mode: "court", note: "10 court days after service (excludes weekends & judicial holidays)." },
  { label: "California motion opposition (CCP 1005(b))", days: -9, mode: "court", note: "9 court days before the hearing." },
];
