import { useState } from "react";
import type { Case, TimelineEvent } from "../lib/types";
import { updateCase } from "../lib/store";
import { uid } from "../lib/id";
import { cl, type DocketResult, type SearchPage } from "../lib/api";
import { applyDocket, entryKey } from "../lib/docket";
import { ClGate } from "../components/ClGate";
import { CourtPicker } from "../components/CourtIds";
import { Empty, Field, Section } from "../components/ui";

export function CourtRecords({ c, clReady }: { c: Case; clReady: boolean }) {
  return (
    <div className="stack">
      {!clReady && <ClGate />}
      {c.docket ? <LinkedDocketView c={c} clReady={clReady} /> : <FindDocket c={c} clReady={clReady} />}
    </div>
  );
}

function FindDocket({ c, clReady }: { c: Case; clReady: boolean }) {
  const [q, setQ] = useState(c.caseNumber ? `docketNumber:"${c.caseNumber}"` : c.title !== "Untitled case" ? c.title : "");
  const [court, setCourt] = useState("");
  const [page, setPage] = useState<SearchPage<DocketResult> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const search = async (cursor?: string) => {
    setBusy("search");
    setError("");
    try {
      const next = await cl.dockets({ q, court, cursor });
      setPage((p) => (cursor && p ? { ...next, results: [...p.results, ...next.results] } : next));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
  };

  const link = async (r: DocketResult) => {
    setBusy(String(r.docketId));
    setError("");
    try {
      const detail = await cl.docket(r.docketId);
      updateCase(c.id, (x) => applyDocket(x, detail).next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
  };

  return (
    <Section title="Find your case in court records">
      <p className="muted small">
        Searches federal court dockets on CourtListener (copied from PACER), including bankruptcy courts. Most state trial courts (small claims, eviction,
        family) are <strong>not</strong> covered — for those, keep uploading documents in "Analyze &amp; Prep".
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) search();
        }}
      >
        <div className="form-grid">
          <Field label="Case number, party names or keywords" hint={'Tip: docketNumber:"3:24-cv-01234" or "Jones v. Acme"'}>
            <input value={q} onChange={(e) => setQ(e.target.value)} />
          </Field>
          <Field label="Court">
            <CourtPicker value={court} onChange={setCourt} />
          </Field>
        </div>
        <button className="btn primary" disabled={!clReady || !q.trim() || busy !== null}>
          {busy === "search" ? "Searching…" : "Search dockets"}
        </button>
      </form>
      {error && <div className="notice">{error}</div>}
      {page &&
        (page.results.length === 0 ? (
          <Empty title="No dockets found">Try just the last names of the parties, or remove the court filter.</Empty>
        ) : (
          <>
            <div className="muted small">{page.count.toLocaleString()} matching dockets</div>
            <ul className="list">
              {page.results.map((r) => (
                <li key={r.docketId} className="list-item">
                  <div>
                    <strong>{r.caseName}</strong>
                    <div className="muted small">
                      {[r.court, r.docketNumber, r.dateFiled && `filed ${r.dateFiled}`, r.dateTerminated && `closed ${r.dateTerminated}`, r.judge]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    {r.parties.length > 0 && <div className="small">{r.parties.slice(0, 6).join(" · ")}</div>}
                  </div>
                  <a className="link" href={r.url} target="_blank" rel="noreferrer">
                    View
                  </a>
                  <button className="btn primary" disabled={busy !== null} onClick={() => link(r)}>
                    {busy === String(r.docketId) ? "Linking…" : "This is my case"}
                  </button>
                </li>
              ))}
            </ul>
            {page.next && (
              <button className="btn" disabled={busy !== null} onClick={() => search(page.next)}>
                Load more
              </button>
            )}
          </>
        ))}
    </Section>
  );
}

function LinkedDocketView({ c, clReady }: { c: Case; clReady: boolean }) {
  const d = c.docket!;
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const fresh = new Set(d.newEntryKeys);
  const inTimeline = new Set(c.timeline.map((t) => `${t.date}|${t.title}`));

  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key);
    setMsg("");
    try {
      setMsg(await fn());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
  };

  const sync = () =>
    run("sync", async () => {
      const detail = await cl.docket(d.docketId);
      let count = 0;
      updateCase(c.id, (x) => {
        const r = applyDocket(x, detail);
        count = r.newEntries;
        return r.next;
      });
      return count ? `${count} new docket ${count === 1 ? "entry" : "entries"} since the last sync.` : "Up to date — no new entries.";
    });

  const toggleWatch = () =>
    run("watch", async () => {
      if (d.alertId) {
        await cl.unwatch(d.alertId);
        updateCase(c.id, (x) => ({ ...x, docket: x.docket && { ...x.docket, alertId: undefined } }));
        return "Stopped email alerts for this docket.";
      }
      const a = await cl.watch(d.docketId);
      updateCase(c.id, (x) => ({ ...x, docket: x.docket && { ...x.docket, alertId: a.id } }));
      return "CourtListener will email you (at your CourtListener account address) when new filings appear.";
    });

  const toTimeline = (e: (typeof d.entries)[number]) => {
    if (!e.dateFiled) return;
    const ev: TimelineEvent = {
      id: uid(),
      date: e.dateFiled,
      title: `Docket #${e.entryNumber ?? "?"}: ${e.description.slice(0, 90)}${e.description.length > 90 ? "…" : ""}`,
      description: e.description,
      evidenceIds: [],
    };
    updateCase(c.id, (x) => ({ ...x, timeline: [...x.timeline, ev] }));
  };

  return (
    <>
      <Section
        title="Linked court docket"
        actions={
          <>
            <button className="btn" disabled={!clReady || busy !== null} onClick={sync}>
              {busy === "sync" ? "Syncing…" : "Sync now"}
            </button>
            <button className="btn" disabled={!clReady || busy !== null} onClick={toggleWatch}>
              {d.alertId ? "Stop alerts" : "Email me new filings"}
            </button>
            <a className="btn" href={d.url} target="_blank" rel="noreferrer">
              Open on CourtListener
            </a>
            <button
              className="link danger"
              onClick={() => confirm("Unlink this docket? Your case data stays.") && updateCase(c.id, (x) => ({ ...x, docket: undefined }))}
            >
              Unlink
            </button>
          </>
        }
      >
        <div className="kv">
          <div>
            <span>Case</span>
            {d.caseName}
          </div>
          <div>
            <span>Court</span>
            {d.court}
          </div>
          {d.docketNumber && (
            <div>
              <span>Docket no.</span>
              {d.docketNumber}
            </div>
          )}
          {d.judge && (
            <div>
              <span>Judge</span>
              {d.judge}
            </div>
          )}
          {d.dateFiled && (
            <div>
              <span>Filed</span>
              {d.dateFiled}
            </div>
          )}
          {d.dateTerminated && (
            <div>
              <span>Closed</span>
              {d.dateTerminated}
            </div>
          )}
          {d.natureOfSuit && (
            <div>
              <span>Nature of suit</span>
              {d.natureOfSuit}
            </div>
          )}
          {d.cause && (
            <div>
              <span>Cause</span>
              {d.cause}
            </div>
          )}
        </div>
        <div className="muted small">Last synced {new Date(d.lastSynced).toLocaleString()}</div>
        {msg && <div className="notice">{msg}</div>}
      </Section>

      <Section title={`Docket entries (${d.entries.length})`}>
        {d.entriesNote && <div className="hint">{d.entriesNote}</div>}
        {d.entries.length === 0 ? (
          <Empty title="No entries available">
            CourtListener only has entries someone has already pulled from PACER. Try "Sync now" later, or check PACER directly.
          </Empty>
        ) : (
          <ul className="list">
            {d.entries.map((e) => {
              const key = entryKey(e);
              const added = e.dateFiled && inTimeline.has(`${e.dateFiled}|Docket #${e.entryNumber ?? "?"}: ${e.description.slice(0, 90)}${e.description.length > 90 ? "…" : ""}`);
              return (
                <li key={key} className="list-item top">
                  <div className="entry-no">#{e.entryNumber ?? "–"}</div>
                  <div className="grow">
                    <div className="muted small">
                      {e.dateFiled} {fresh.has(key) && <span className="badge warn">new</span>}
                    </div>
                    <div className="small">{e.description || <em className="muted">(no description)</em>}</div>
                    {e.documents.length > 0 && (
                      <div className="row small">
                        {e.documents.map((doc, i) =>
                          doc.pdfUrl ? (
                            <a key={i} className="badge ok" href={doc.pdfUrl} target="_blank" rel="noreferrer">
                              📄 {doc.description || `Document ${doc.documentNumber ?? i + 1}`}
                              {doc.pageCount ? ` (${doc.pageCount}p)` : ""}
                            </a>
                          ) : (
                            <a key={i} className="badge muted" href={doc.url} target="_blank" rel="noreferrer" title="Not in the free RECAP archive yet">
                              {doc.description || `Document ${doc.documentNumber ?? i + 1}`} · PACER only
                            </a>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                  {e.dateFiled &&
                    (added ? (
                      <span className="muted small">in timeline</span>
                    ) : (
                      <button className="link" onClick={() => toTimeline(e)}>
                        Add to timeline
                      </button>
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
