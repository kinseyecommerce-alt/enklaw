import type { Case } from "./types";

/** Serializes a case into a compact text summary the AI can reason over. */
export function caseContext(c: Case): string {
  const lines: string[] = [];
  lines.push(`Case: ${c.title}`);
  if (c.caseNumber) lines.push(`Case number: ${c.caseNumber}`);
  if (c.court) lines.push(`Court: ${c.court}`);
  if (c.jurisdiction) lines.push(`Jurisdiction: ${c.jurisdiction}`);
  if (c.judge) lines.push(`Judge: ${c.judge}`);
  if (c.caseType) lines.push(`Case type: ${c.caseType}`);
  lines.push(`My role: ${c.myRole} (self-represented)`);
  lines.push(`Status: ${c.status}`);
  lines.push(`Today's date: ${new Date().toISOString().slice(0, 10)}`);
  if (c.summary) lines.push(`\nSummary of the dispute:\n${c.summary}`);
  if (c.goals) lines.push(`\nMy goals:\n${c.goals}`);

  if (c.parties.length) {
    lines.push("\nParties:");
    for (const p of c.parties)
      lines.push(`- ${p.name} — ${p.role}${p.attorney ? ` (attorney: ${p.attorney})` : ""}${p.contact ? ` [${p.contact}]` : ""}`);
  }
  if (c.deadlines.length) {
    lines.push("\nDeadlines & hearings:");
    for (const d of [...c.deadlines].sort((a, b) => a.date.localeCompare(b.date)))
      lines.push(`- ${d.date}${d.time ? ` ${d.time}` : ""} [${d.kind}${d.done ? ", done" : ""}] ${d.title}${d.location ? ` @ ${d.location}` : ""}${d.notes ? ` — ${d.notes}` : ""}`);
  }
  if (c.evidence.length) {
    lines.push("\nEvidence / exhibits:");
    for (const e of c.evidence)
      lines.push(`- Exhibit ${e.exhibit}: ${e.title} (${e.kind}${e.date ? `, ${e.date}` : ""})${e.description ? ` — ${e.description}` : ""}${e.relevance ? ` | Relevance: ${e.relevance}` : ""}`);
  }
  if (c.timeline.length) {
    const ex = new Map(c.evidence.map((e) => [e.id, e.exhibit]));
    lines.push("\nTimeline:");
    for (const t of [...c.timeline].sort((a, b) => a.date.localeCompare(b.date))) {
      const refs = t.evidenceIds.map((id) => ex.get(id)).filter(Boolean);
      lines.push(`- ${t.date}: ${t.title}${t.description ? ` — ${t.description}` : ""}${refs.length ? ` (Exhibits ${refs.join(", ")})` : ""}`);
    }
  }
  if (c.notes.length) {
    lines.push("\nMy notes:");
    for (const n of c.notes) lines.push(`## ${n.title}\n${n.body}`);
  }
  return lines.join("\n");
}
