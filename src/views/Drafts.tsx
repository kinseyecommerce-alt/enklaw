import { useRef, useState } from "react";
import type { Case, Draft } from "../lib/types";
import { updateCase } from "../lib/store";
import { uid } from "../lib/id";
import { streamPost } from "../lib/api";
import { caseContext } from "../lib/context";
import { downloadDoc, downloadFile, printMarkdown, slug } from "../lib/download";
import { Markdown } from "../components/Markdown";
import { AiGate } from "../components/AiGate";
import { Empty, Field, Section } from "../components/ui";
import { CitationChecker } from "../components/CitationChecker";

const DOC_TYPES = [
  "Answer to complaint",
  "Motion to dismiss",
  "Motion to continue / postpone hearing",
  "Motion for extension of time",
  "Opposition to motion",
  "Declaration / affidavit",
  "Proposed order",
  "Demand letter",
  "Settlement offer letter",
  "Discovery requests (interrogatories, document requests)",
  "Responses to discovery",
  "Proof / certificate of service",
  "Trial brief",
  "Small claims statement",
  "Letter to the court / clerk",
  "Notice of appeal",
  "Other",
];

export function Drafts({ c, aiReady, clReady }: { c: Case; aiReady: boolean; clReady: boolean }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [custom, setCustom] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(true);
  const [caseLaw, setCaseLaw] = useState(true);
  const abort = useRef<AbortController | null>(null);

  const active = c.drafts.find((d) => d.id === activeId);
  const saveDraft = (id: string, patch: Partial<Draft>) =>
    updateCase(c.id, (x) => ({ ...x, drafts: x.drafts.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d)) }));

  const generate = async () => {
    const type = docType === "Other" ? custom || "Document" : docType;
    const d: Draft = { id: uid(), title: type, docType: type, body: "", updatedAt: new Date().toISOString() };
    updateCase(c.id, (x) => ({ ...x, drafts: [d, ...x.drafts] }));
    setActiveId(d.id);
    setPreview(true);
    setBusy(true);
    abort.current = new AbortController();
    try {
      await streamPost("/api/draft", { caseContext: caseContext(c), docType: type, instructions, caseLaw: caseLaw && clReady }, (body) => saveDraft(d.id, { body }), abort.current.signal);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) alert(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  return (
    <div className="split wide-right">
      <div className="stack">
        <Section title="Draft a document">
          {!aiReady && <AiGate />}
          <Field label="Document type">
            <select value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          {docType === "Other" && (
            <Field label="Describe the document">
              <input value={custom} onChange={(e) => setCustom(e.target.value)} />
            </Field>
          )}
          <Field label="What should it say or accomplish?" hint="Key facts, what you're asking the court for, tone, anything to include.">
            <textarea rows={5} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </Field>
          <label className="check" title={clReady ? "" : "Add COURTLISTENER_API_TOKEN to .env to enable"}>
            <input type="checkbox" disabled={!clReady} checked={caseLaw && clReady} onChange={(e) => setCaseLaw(e.target.checked)} /> Find & verify real case
            law on CourtListener (slower)
          </label>
          <div className="row">
            <button className="btn primary" disabled={!aiReady || busy} onClick={generate}>
              {busy ? "Drafting…" : "Generate draft"}
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => {
                const d: Draft = { id: uid(), title: "Blank document", docType: "Custom", body: "", updatedAt: new Date().toISOString() };
                updateCase(c.id, (x) => ({ ...x, drafts: [d, ...x.drafts] }));
                setActiveId(d.id);
                setPreview(false);
              }}
            >
              Start blank
            </button>
          </div>
        </Section>

        <Section title="Saved documents">
          {c.drafts.length === 0 ? (
            <Empty title="No documents yet" />
          ) : (
            <ul className="list">
              {c.drafts.map((d) => (
                <li key={d.id} className={`list-item clickable ${d.id === activeId ? "selected" : ""}`} onClick={() => setActiveId(d.id)}>
                  <div>
                    <strong>{d.title}</strong>
                    <div className="muted small">{new Date(d.updatedAt).toLocaleString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section
        title={active ? "Document" : "Preview"}
        actions={
          active && (
            <>
              {busy && (
                <button className="btn" onClick={() => abort.current?.abort()}>
                  Stop
                </button>
              )}
              <button className="btn" onClick={() => setPreview((p) => !p)}>
                {preview ? "Edit" : "Preview"}
              </button>
              <button className="btn" onClick={() => downloadDoc(slug(active.title), active.body)}>
                Word (.doc)
              </button>
              <button className="btn" onClick={() => downloadFile(`${slug(active.title)}.md`, active.body)}>
                .md
              </button>
              <button className="btn" onClick={() => printMarkdown(active.title, active.body)}>
                Print / PDF
              </button>
              <button
                className="link danger"
                onClick={() => {
                  if (!confirm("Delete this document?")) return;
                  updateCase(c.id, (x) => ({ ...x, drafts: x.drafts.filter((d) => d.id !== active.id) }));
                  setActiveId(null);
                }}
              >
                Delete
              </button>
            </>
          )
        }
      >
        {!active ? (
          <Empty title="Select or generate a document">Drafts are a starting point — review every fact, citation and [PLACEHOLDER] before filing.</Empty>
        ) : (
          <div className="stack">
            <input value={active.title} onChange={(e) => saveDraft(active.id, { title: e.target.value })} />
            {clReady && <CitationChecker key={active.id} text={active.body} disabled={busy} />}
            {preview ? (
              <div className="paper">
                <Markdown text={active.body || "_Drafting…_"} />
              </div>
            ) : (
              <textarea className="mono" rows={28} value={active.body} onChange={(e) => saveDraft(active.id, { body: e.target.value })} />
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
