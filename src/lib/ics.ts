import type { Case, Deadline } from "./types";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** Builds an iCalendar file so deadlines can be imported into Google/Apple/Outlook calendars. */
export function toICS(c: Case, deadlines: Deadline[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const events = deadlines.map((d) => {
    const day = d.date.replace(/-/g, "");
    const when = d.time
      ? `DTSTART:${day}T${d.time.replace(":", "")}00\nDURATION:PT1H`
      : `DTSTART;VALUE=DATE:${day}`;
    return [
      "BEGIN:VEVENT",
      `UID:${d.id}@enklaw`,
      `DTSTAMP:${stamp}`,
      when,
      `SUMMARY:${esc(`[${c.title}] ${d.title}`)}`,
      d.location ? `LOCATION:${esc(d.location)}` : "",
      `DESCRIPTION:${esc(`${d.kind}${c.caseNumber ? ` — Case ${c.caseNumber}` : ""}${d.notes ? `\n${d.notes}` : ""}`)}`,
      "BEGIN:VALARM\nTRIGGER:-P1D\nACTION:DISPLAY\nDESCRIPTION:Court deadline tomorrow\nEND:VALARM",
      "END:VEVENT",
    ]
      .filter(Boolean)
      .join("\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EnkLaw//Court Assistant//EN", ...events, "END:VCALENDAR"].join("\r\n");
}
