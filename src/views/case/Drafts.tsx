import { useRef, useState } from "react";
import type { Case, Draft } from "../../lib/types";
import { updateCase } from "../../lib/store";
import { uid } from "../../lib/id";
import { streamPost } from "../../lib/api";
import { caseContext } from "../../lib/context";
import { downloadDoc, downloadFile, printMarkdown, slug } from "../../lib/download";
import { Markdown } from "../../components/Markdown";
import { AiGate } from "../../components/Gates";
import { Empty, Field, Section } from "../../components/ui";


const DOC_TYPES = [
  "Legal notice",
  "Demand notice under S.138 NI Act (cheque bounce)",
  "Complaint under S.138 NI Act",
  "Plaint (civil suit)",
  "Written statement",
  "Application for temporary injunction (O.XXXIX r.1 & 2 CPC)",
  "Application for condonation of delay (S.5 Limitation Act)",
  "Application for adjournment",
  "Application for exemption from personal appearance",
  "Regular bail application (S.483 BNSS / S.439 CrPC)",
  "Anticipatory bail application (S.482 BNSS / S.438 CrPC)",
  "Petition for quashing (S.528 BNSS / S.482 CrPC)",
  "Writ petition (Article 226)",
  "Special Leave Petition with synopsis & list of dates",
  "Reply / counter affidavit",
  "Rejoinder",
  "Affidavit",
  "Consumer complaint (Consumer Protection Act, 2019)",
  "Execution petition",
  "Written submissions / synopsis of arguments",
  "Memo of appearance / vakalatnama",
  "Other",
];

export function Drafts({ c, aiReady, ikReady }: { c: Case; aiReady: boolean; ikReady: boolean }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [custom, setCustom] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(true);
  const [research, setResearch] = useState(true);
  const [verify, setVerify] = useState<{ id: string; text: string; busy: boolean } | null>(null);
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
      await streamPost("/api/draft", { caseContext: caseContext(c), docType: type, instructions, research: research && ikReady }, (body) => saveDraft(d.id, { body }), abort.current.signal);
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
          <Field label="Key facts & what it must achieve" hint="Facts, relief / prayer, grounds, anything to include. Case details are added automatically.">
            <textarea rows={5} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </Field>
          <label className="check" title={ikReady ? "" : "Add INDIANKANOON_API_TOKEN to .env to enable"}>
            <input type="checkbox" disabled={!ikReady} checked={research && ikReady} onChange={(e) => setResearch(e.target.checked)} /> Find & confirm real
            judgments on Indian Kanoon (slower)
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
          <Empty title="Select or generate a document">Drafts are a starting point — check every fact, section, citation and [PLACEHOLDER] before filing.</Empty>
        ) : (
          <div className="stack">
            <input value={active.title} onChange={(e) => saveDraft(active.id, { title: e.target.value })} />
            {ikReady && aiReady && (
              <div className="row">
                <button
                  className="btn"
                  disabled={busy || !active.body.trim() || verify?.busy}
                  onClick={async () => {
                    setVerify({ id: active.id, text: "", busy: true });
                    try {
                      await streamPost("/api/verify-citations", { text: active.body }, (text) => setVerify({ id: active.id, text, busy: true }));
                      setVerify((v) => v && { ...v, busy: false });
                    } catch (e) {
                      setVerify({ id: active.id, text: e instanceof Error ? e.message : String(e), busy: false });
                    }
                  }}
                >
                  {verify?.busy ? "Verifying citations…" : "Verify citations"}
                </button>
                {verify?.id === active.id && !verify.busy && (
                  <button className="link" onClick={() => setVerify(null)}>
                    Hide report
                  </button>
                )}
              </div>
            )}
            {verify?.id === active.id && (
              <div className="subcard">
                <Markdown text={verify.text || "_Checking each citation on Indian Kanoon…_"} />
              </div>
            )}
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
