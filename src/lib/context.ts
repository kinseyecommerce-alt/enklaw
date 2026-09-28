import type { Case } from "./types";
import { caseNo, courtLabel } from "./courts";
import { fmt, todayISO } from "./dates";

/** Serializes a case into a compact text summary the AI can reason over. */
export function caseContext(c: Case): string {
  const L: string[] = [];
  const add = (label: string, v?: string) => v && L.push(`${label}: ${v}`);
  L.push(`Cause title: ${c.title}`);
  add("Forum", `${courtLabel(c.courtType)}${c.court ? ` — ${c.court}` : ""}${c.bench ? ` (${c.bench})` : ""}`);
  add("State / district", [c.state, c.district].filter(Boolean).join(", "));
  add("Case number", caseNo(c));
  add("CNR", c.cnr);
  add("Filing date", fmt(c.filingDate));
  add("FIR", [c.firNumber, c.policeStation].filter(Boolean).join(", P.S. "));
  add("Acts / sections", c.actsSections);
  add("Judge / bench", c.judge);
  add("Stage", c.stage);
  L.push(`We represent: ${c.side}${c.client.name ? ` (client: ${c.client.name})` : ""}`);
  L.push(`Status: ${c.status}${c.disposalDate ? `, disposed on ${fmt(c.disposalDate)}${c.disposalNature ? ` (${c.disposalNature})` : ""}` : ""}`);
  L.push(`Today's date: ${fmt(todayISO())}`);
  if (c.summary) L.push(`\nFacts / summary:\n${c.summary}`);
  if (c.goals) L.push(`\nObjective:\n${c.goals}`);

  if (c.parties.length) {
    L.push("\nParties:");
    for (const p of c.parties) L.push(`- ${p.name} — ${p.side}${p.advocate ? ` (Adv. ${p.advocate})` : ""}`);
  }
  if (c.hearings.length) {
    L.push("\nHearing history (DD-MM-YYYY):");
    for (const h of [...c.hearings].sort((a, b) => a.date.localeCompare(b.date)))
      L.push(`- ${fmt(h.date)}${h.purpose ? ` [${h.purpose}]` : ""}${h.itemNo ? ` item ${h.itemNo}` : ""}: ${h.outcome ?? "(upcoming / not updated)"}${h.nextDate ? ` → next ${fmt(h.nextDate)}` : ""}`);
  }
  if (c.orders.length) {
    L.push("\nOrders:");
    for (const o of [...c.orders].sort((a, b) => a.date.localeCompare(b.date))) L.push(`- ${fmt(o.date)}: ${o.title}${o.summary ? ` — ${o.summary}` : ""}`);
  }
  const open = c.tasks.filter((t) => !t.done);
  if (open.length) {
    L.push("\nPending compliances / tasks:");
    for (const t of open) L.push(`- ${fmt(t.due)}: ${t.title}${t.notes ? ` — ${t.notes}` : ""}`);
  }
  if (c.annexures.length) {
    L.push("\nAnnexures / documents:");
    for (const a of c.annexures)
      L.push(`- Annexure ${a.label}: ${a.title}${a.date ? ` (${fmt(a.date)})` : ""}${a.description ? ` — ${a.description}` : ""}${a.relevance ? ` | Relevance: ${a.relevance}` : ""}`);
  }
  if (c.timeline.length) {
    const ann = new Map(c.annexures.map((a) => [a.id, a.label]));
    L.push("\nList of dates & events:");
    for (const t of [...c.timeline].sort((a, b) => a.date.localeCompare(b.date))) {
      const refs = t.evidenceIds.map((id) => ann.get(id)).filter(Boolean);
      L.push(`- ${fmt(t.date)}: ${t.title}${t.description ? ` — ${t.description}` : ""}${refs.length ? ` (Annexure ${refs.join(", ")})` : ""}`);
    }
  }
  if (c.notes.length) {
    L.push("\nNotes:");
    for (const n of c.notes) L.push(`## ${n.title}\n${n.body}`);
  }
  return L.join("\n");
}
