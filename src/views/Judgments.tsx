import { useEffect, useState } from "react";
import type { Case, Note } from "../lib/types";
import { updateCase } from "../lib/store";
import { uid } from "../lib/id";
import { ik, type Judgment } from "../lib/api";
import { IkGate } from "../components/Gates";
import { Markdown } from "../components/Markdown";
import { Empty, Field, Section } from "../components/ui";

const toMarkdown = (j: Judgment) => `**[${j.title}](${j.url})** — ${j.court}${j.date ? `, ${j.date}` : ""}${j.headline ? `\n\n> ${j.headline}` : ""}`;

export function Judgments({ cases, ikReady }: { cases: Case[]; ikReady: boolean }) {
  const [courts, setCourts] = useState<Record<string, string>>({ judgments: "All courts" });
  const [q, setQ] = useState("");
  const [court, setCourt] = useState("judgments");
  const [from, setFrom] = useState("");
  const [sort, setSort] = useState("");
  const [results, setResults] = useState<Judgment[] | null>(null);
  const [found, setFound] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [target, setTarget] = useState(cases[0]?.id ?? "");
  const [saved, setSaved] = useState<Set<number>>(new Set());

  useEffect(() => {
    ik.courts().then(setCourts).catch(() => {});
  }, []);

  const search = async (p = 0) => {
    setBusy(true);
    setError("");
    try {
      const r = await ik.search({ q, court, from, sort, page: p });
      setResults((prev) => (p > 0 && prev ? [...prev, ...r.results] : r.results));
      setFound(r.found);
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  const save = (j: Judgment) => {
    if (!target) return;
    updateCase(target, (x) => {
      const existing = x.notes.find((n) => n.title === "Judgments");
      const note: Note = {
        id: existing?.id ?? uid(),
        title: "Judgments",
        body: `${existing ? `${existing.body}\n\n---\n\n` : ""}${toMarkdown(j)}`,
        updatedAt: new Date().toISOString(),
      };
      return { ...x, notes: existing ? x.notes.map((n) => (n.id === existing.id ? note : n)) : [note, ...x.notes] };
    });
    setSaved((s) => new Set(s).add(j.id));
  };

  return (
    <div className="page">
      <h1>Judgments</h1>
      <p className="muted">Search Supreme Court, High Court and tribunal judgments on Indian Kanoon. Save useful ones to a case so the AI can use them.</p>
      {!ikReady && <IkGate />}
      <Section title="Search">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) search(0);
          }}
        >
          <Field label="Search terms" hint='Phrases in quotes; combine with ANDD, ORR, NOTT — e.g. "anticipatory bail" ANDD "dowry"'>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='"section 138" ANDD "legal notice" ANDD "limitation"' />
          </Field>
          <div className="form-grid">
            <Field label="Court">
              <select value={court} onChange={(e) => setCourt(e.target.value)}>
                {Object.entries(courts).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Decided after">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Sort">
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="">Relevance</option>
                <option value="mostrecent">Newest first</option>
                <option value="leastrecent">Oldest first</option>
              </select>
            </Field>
          </div>
          <button className="btn primary" disabled={!ikReady || busy || !q.trim()}>
            {busy ? "Searching…" : "Search"}
          </button>
          <span className="hint"> Each search uses ₹0.50 of Indian Kanoon credit.</span>
        </form>
        {error && <div className="notice">{error}</div>}
      </Section>

      {results && (
        <Section
          title={`${found} results`}
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
          {results.length === 0 ? (
            <Empty title="No judgments found">Try fewer words or a broader court filter.</Empty>
          ) : (
            <ul className="list">
              {results.map((j) => (
                <li key={j.id} className="list-item top">
                  <div className="grow">
                    <a href={j.url} target="_blank" rel="noreferrer" className="case-link">
                      {j.title}
                    </a>
                    <div className="muted small">{[j.court, j.date, j.citedBy ? `cited by ${j.citedBy}` : ""].filter(Boolean).join(" · ")}</div>
                    {j.headline && (
                      <div className="snippet small">
                        <Markdown text={j.headline} />
                      </div>
                    )}
                  </div>
                  {cases.length > 0 && (
                    <button className="btn" disabled={saved.has(j.id)} onClick={() => save(j)}>
                      {saved.has(j.id) ? "Saved" : "Save"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {results.length > 0 && results.length % 10 === 0 && (
            <button className="btn" disabled={busy} onClick={() => search(page + 1)}>
              Load more
            </button>
          )}
        </Section>
      )}
      <p className="disclaimer">Read the full judgment and check it has not been overruled or distinguished before relying on it.</p>
    </div>
  );
}
