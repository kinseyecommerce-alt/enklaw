import type { Case } from "./types";
import { caseNo } from "./courts";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** iCalendar export of upcoming hearings and tasks, for Google / Outlook / phone calendars. */
export function toICS(cases: Case[], from: string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const ev = (uidPart: string, date: string, summary: string, desc: string) =>
    [
      "BEGIN:VEVENT",
      `UID:${uidPart}@enklaw`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${date.replace(/-/g, "")}`,
      `SUMMARY:${esc(summary)}`,
      `DESCRIPTION:${esc(desc)}`,
      "BEGIN:VALARM\nTRIGGER:-PT15H\nACTION:DISPLAY\nDESCRIPTION:Hearing tomorrow\nEND:VALARM",
      "END:VEVENT",
    ].join("\n");
  const events = cases.flatMap((c) => [
    ...c.hearings
      .filter((h) => h.date >= from && !h.outcome)
      .map((h) => ev(h.id, h.date, `${caseNo(c) || c.title}${h.itemNo ? ` (Item ${h.itemNo})` : ""}`, `${c.title}\n${c.court ?? ""}${h.purpose ? `\n${h.purpose}` : ""}${h.courtHall ? `\nCourt ${h.courtHall}` : ""}`)),
    ...c.tasks.filter((t) => !t.done && t.due >= from).map((t) => ev(t.id, t.due, `Task: ${t.title}`, `${c.title}${t.notes ? `\n${t.notes}` : ""}`)),
  ]);
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EnkLaw//Case Diary//EN", ...events, "END:VCALENDAR"].join("\r\n");
}
