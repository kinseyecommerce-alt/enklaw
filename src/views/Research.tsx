import { useState } from "react";
import type { Case, Note } from "../lib/types";
import { updateCase } from "../lib/store";
import { uid } from "../lib/id";
import { cl, type OpinionResult, type SearchPage } from "../lib/api";
import { ClGate } from "../components/ClGate";
import { CourtPicker } from "../components/CourtIds";
import { Markdown } from "../components/Markdown";
import { Empty, Field, Section } from "../components/ui";

const toMarkdown = (r: OpinionResult) =>
  `**[${r.caseName}](${r.url})**${r.citations.length ? `, ${r.citations.join(", ")}` : ""} (${r.court}${r.dateFiled ? `, ${r.dateFiled.slice(0, 4)}` : ""})${
    r.snippet ? `\n\n> ${r.snippet}` : ""
  }`;

export function Research({ cases, clReady }: { cases: Case[]; clReady: boolean }) {
  const [q, setQ] = useState("");
  const [court, setCourt] = useState("");
  const [after, setAfter] = useState("");
  const [order, setOrder] = useState("score desc");
  const [page, setPage] = useState<SearchPage<OpinionResult> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [target, setTarget] = useState(cases[0]?.id ?? "");
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const search = async (cursor?: string) => {
    setBusy(true);
    setError("");
    try {
      const next = await cl.opinions({ q, court: court.trim(), filed_after: after, order_by: order, cursor });
      setPage((p) => (cursor && p ? { ...next, results: [...p.results, ...next.results] } : next));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  const save = (r: OpinionResult) => {
    const c = cases.find((x) => x.id === target);
    if (!c) return;
    updateCase(c.id, (x) => {
      const existing = x.notes.find((n) => n.title === "Case law research");
      const body = `${existing ? `${existing.body}\n\n---\n\n` : ""}${toMarkdown(r)}`;
      const note: Note = { id: existing?.id ?? uid(), title: "Case law research", body, updatedAt: new Date().toISOString() };
      return { ...x, notes: existing ? x.notes.map((n) => (n.id === existing.id ? note : n)) : [note, ...x.notes] };
    });
    setSaved((s) => new Set(s).add(r.clusterId));
  };

  return (
    <div className="page">
      <h1>Case law research</h1>
      <p className="muted">
        Search millions of real U.S. court opinions on CourtListener. Save useful cases to a case's notes so the AI assistant can use them.
      </p>
      {!clReady && <ClGate />}
      <Section title="Search opinions">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) search();
          }}
        >
          <Field label="Search terms" hint='Use quotes for phrases and AND / OR / NOT, e.g. "security deposit" AND "bad faith"'>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='"implied warranty of habitability" AND "rent"' />
          </Field>
          <div className="form-grid">
            <Field label="Court">
              <CourtPicker value={court} onChange={setCourt} />
            </Field>
            <Field label="Decided after">
              <input type="date" value={after} onChange={(e) => setAfter(e.target.value)} />
            </Field>
            <Field label="Sort by">
              <select value={order} onChange={(e) => setOrder(e.target.value)}>
                <option value="score desc">Relevance</option>
                <option value="dateFiled desc">Newest first</option>
                <option value="citeCount desc">Most cited</option>
              </select>
            </Field>
          </div>
          <button className="btn primary" disabled={!clReady || busy || !q.trim()}>
            {busy ? "Searching…" : "Search"}
          </button>
        </form>
        {error && <div className="notice">{error}</div>}
      </Section>

      {page && (
        <Section
          title={`${page.count.toLocaleString()} opinions`}
          actions={
            cases.length > 0 && (
              <label className="row small">
                Save to
                <select value={target} onChange={(e) => setTarget(e.target.value)}>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            )
          }
        >
          {page.results.length === 0 ? (
            <Empty title="No opinions found">Try fewer or broader terms, or remove the court filter.</Empty>
          ) : (
            <ul className="list">
              {page.results.map((r) => (
                <li key={r.clusterId} className="list-item top">
                  <div className="grow">
                    <a href={r.url} target="_blank" rel="noreferrer" className="case-link">
                      {r.caseName}
                    </a>
                    <div className="muted small">
                      {[r.citations.join(", "), r.court, r.dateFiled, `cited ${r.citeCount}×`, r.status].filter(Boolean).join(" · ")}
                    </div>
                    {r.snippet && (
                      <div className="snippet small">
                        <Markdown text={r.snippet} />
                      </div>
                    )}
                  </div>
                  {cases.length > 0 && (
                    <button className="btn" disabled={saved.has(r.clusterId)} onClick={() => save(r)}>
                      {saved.has(r.clusterId) ? "Saved" : "Save"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {page.next && (
            <button className="btn" disabled={busy} onClick={() => search(page.next)}>
              Load more
            </button>
          )}
        </Section>
      )}
      <p className="disclaimer">
        Always read the full opinion and check that it is still good law in your jurisdiction before relying on it. Unpublished opinions may not be citable.
      </p>
    </div>
  );
}
