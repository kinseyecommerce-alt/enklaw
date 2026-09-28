import { useState } from "react";
import type { Case, CourtType } from "../lib/types";
import { newCase } from "../lib/store";
import { nextHearing } from "../lib/diary";
import { COURT_TYPES, caseNo, courtShort } from "../lib/courts";
import { fmt } from "../lib/dates";
import { Empty } from "../components/ui";

export function Cases({ cases, openCase }: { cases: Case[]; openCase: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [court, setCourt] = useState<CourtType | "">("");
  const [status, setStatus] = useState<Case["status"] | "">("pending");

  const needle = q.trim().toLowerCase();
  const rows = cases
    .filter((c) => (!court || c.courtType === court) && (!status || c.status === status))
    .filter(
      (c) =>
        !needle ||
        [c.title, caseNo(c), c.cnr, c.court, c.client.name, c.firNumber, c.tags, ...c.parties.map((p) => p.name)]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(needle)),
    )
    .map((c) => ({ c, next: nextHearing(c) }))
    .sort((a, b) => (a.next?.date ?? "9999").localeCompare(b.next?.date ?? "9999"));

  return (
    <div className="page">
      <div className="row between">
        <h1>Cases</h1>
        <button className="btn primary" onClick={() => openCase(newCase().id)}>
          + New case
        </button>
      </div>
      <div className="filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by party, case no., CNR, client, FIR…" />
        <select value={court} onChange={(e) => setCourt(e.target.value as CourtType | "")}>
          <option value="">All forums</option>
          {COURT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as Case["status"] | "")}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="reserved">Judgment reserved</option>
          <option value="disposed">Disposed</option>
        </select>
      </div>
      <section className="card">
        {rows.length === 0 ? (
          <Empty title={cases.length ? "No cases match" : "No cases yet"}>{!cases.length && "Add your first case to start your diary."}</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Forum</th>
                <th>Stage</th>
                <th>Next date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, next }) => (
                <tr key={c.id} className="clickable" onClick={() => openCase(c.id)}>
                  <td>
                    <strong>{caseNo(c) || "—"}</strong>
                    <div className="small">{c.title}</div>
                    {c.client.name && <div className="muted small">Client: {c.client.name}</div>}
                  </td>
                  <td className="small">
                    <span className="badge muted">{courtShort(c.courtType)}</span> {c.court}
                  </td>
                  <td className="small">{c.status === "disposed" ? <span className="badge ok">Disposed</span> : c.stage}</td>
                  <td className="nowrap">{next ? fmt(next.date) : c.status === "disposed" ? "" : <span className="muted small">awaited</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
