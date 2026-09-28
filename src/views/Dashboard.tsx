import type { Case } from "../lib/types";
import { newCase } from "../lib/store";
import { daysUntil } from "../lib/deadlines";
import { DueBadge, Empty, Section } from "../components/ui";

export function Dashboard({ cases, openCase }: { cases: Case[]; openCase: (id: string, tab?: "deadlines") => void }) {
  const upcoming = cases
    .flatMap((c) => c.deadlines.filter((d) => !d.done).map((d) => ({ c, d, days: daysUntil(d.date) })))
    .sort((a, b) => a.d.date.localeCompare(b.d.date))
    .slice(0, 12);

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="muted">Your personal court assistant. Everything you enter stays in this browser unless you export it.</p>

      <div className="grid-2">
        <Section title="Upcoming deadlines & hearings">
          {upcoming.length === 0 ? (
            <Empty title="Nothing scheduled">Add deadlines inside a case, or use the deadline calculator.</Empty>
          ) : (
            <ul className="list">
              {upcoming.map(({ c, d, days }) => (
                <li key={d.id} className="list-item clickable" onClick={() => openCase(c.id, "deadlines")}>
                  <div>
                    <strong>{d.title}</strong>
                    <div className="muted small">
                      {d.date}
                      {d.time ? ` ${d.time}` : ""} · {d.kind} · {c.title}
                    </div>
                  </div>
                  <DueBadge days={days} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Your cases"
          actions={
            <button className="btn primary" onClick={() => openCase(newCase().id)}>
              New case
            </button>
          }
        >
          {cases.length === 0 ? (
            <Empty title="No cases yet">Create your first case to start organizing parties, deadlines, and evidence.</Empty>
          ) : (
            <ul className="list">
              {cases.map((c) => (
                <li key={c.id} className="list-item clickable" onClick={() => openCase(c.id)}>
                  <div>
                    <strong>{c.title}</strong>
                    <div className="muted small">
                      {[c.caseNumber, c.court].filter(Boolean).join(" · ") || "No details yet"} · {c.evidence.length} exhibits ·{" "}
                      {c.deadlines.filter((d) => !d.done).length} open deadlines
                    </div>
                  </div>
                  <span className={`badge ${c.status === "active" ? "ok" : "muted"}`}>{c.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <p className="disclaimer">
        EnkLaw provides legal information and drafting help, not legal advice. Court rules and deadlines vary by jurisdiction — always confirm
        with your court's rules, clerk, or self-help center, and consider consulting a licensed attorney or legal aid organization.
      </p>
    </div>
  );
}
