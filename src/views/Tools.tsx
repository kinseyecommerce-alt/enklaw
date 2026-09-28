import { useRef, useState } from "react";
import type { Case, Note } from "../lib/types";
import { updateCase } from "../lib/store";
import { uid } from "../lib/id";
import { streamPost } from "../lib/api";
import { caseContext } from "../lib/context";
import { Markdown } from "../components/Markdown";
import { AiGate } from "../components/AiGate";
import { Field, Section } from "../components/ui";

const readAsBase64 = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });

function useStream() {
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const run = async (path: string, body: unknown) => {
    setOut("");
    setBusy(true);
    abort.current = new AbortController();
    try {
      await streamPost(path, body, setOut, abort.current.signal);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setOut((o) => `${o}\n\n[Error: ${e instanceof Error ? e.message : String(e)}]`);
    }
    setBusy(false);
  };
  return { out, busy, run, stop: () => abort.current?.abort() };
}

function saveAsNote(c: Case, title: string, body: string) {
  const n: Note = { id: uid(), title, body, updatedAt: new Date().toISOString() };
  updateCase(c.id, (x) => ({ ...x, notes: [n, ...x.notes] }));
  alert(`Saved to Notes as "${title}".`);
}

export function Tools({ c, aiReady }: { c: Case; aiReady: boolean }) {
  return (
    <div className="stack">
      {!aiReady && <AiGate />}
      <Analyzer c={c} aiReady={aiReady} />
      <HearingPrep c={c} aiReady={aiReady} />
    </div>
  );
}

function Analyzer({ c, aiReady }: { c: Case; aiReady: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const s = useStream();

  const analyze = async () => {
    const body: Record<string, string> = { caseContext: caseContext(c), title: title || file?.name || "Document" };
    if (file && file.type === "application/pdf") body.pdfBase64 = await readAsBase64(file);
    else if (file) body.text = await file.text();
    else body.text = text;
    s.run("/api/analyze", body);
  };

  return (
    <Section title="Analyze a court document">
      <p className="muted small">
        Upload a complaint, motion, order, letter or notice (PDF or text) — or paste its text — to get a plain-English summary, deadlines it triggers, and
        next steps.
      </p>
      <div className="form-grid">
        <Field label="Upload PDF or text file">
          <input
            type="file"
            accept=".pdf,.txt,.md,.eml,.html,text/*,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f && !title) setTitle(f.name);
            }}
          />
        </Field>
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summons and complaint" />
        </Field>
      </div>
      {!file && (
        <Field label="…or paste the text">
          <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
      )}
      <div className="row">
        <button className="btn primary" disabled={!aiReady || s.busy || (!file && !text.trim())} onClick={analyze}>
          {s.busy ? "Analyzing…" : "Analyze"}
        </button>
        {s.busy && (
          <button className="btn" onClick={s.stop}>
            Stop
          </button>
        )}
        {s.out && !s.busy && (
          <button className="btn" onClick={() => saveAsNote(c, `Analysis: ${title || "document"}`, s.out)}>
            Save to notes
          </button>
        )}
      </div>
      {s.out && (
        <div className="subcard">
          <Markdown text={s.out} />
        </div>
      )}
    </Section>
  );
}

function HearingPrep({ c, aiReady }: { c: Case; aiReady: boolean }) {
  const hearings = c.deadlines.filter((d) => !d.done && (d.kind === "hearing" || d.kind === "trial" || d.kind === "meeting"));
  const [hearing, setHearing] = useState(hearings[0] ? `${hearings[0].title} on ${hearings[0].date}` : "");
  const [notes, setNotes] = useState("");
  const s = useStream();

  return (
    <Section title="Hearing preparation">
      <p className="muted small">Get an opening statement, key points tied to your exhibits, likely questions from the judge, and a checklist.</p>
      <div className="form-grid">
        <Field label="Which hearing?">
          {hearings.length ? (
            <select value={hearing} onChange={(e) => setHearing(e.target.value)}>
              {hearings.map((h) => (
                <option key={h.id} value={`${h.title} on ${h.date}`}>
                  {h.date} — {h.title}
                </option>
              ))}
              <option value="">Other…</option>
            </select>
          ) : (
            <input value={hearing} onChange={(e) => setHearing(e.target.value)} placeholder="Motion hearing, trial, mediation…" />
          )}
        </Field>
        {hearings.length > 0 && hearing === "" && (
          <Field label="Describe the hearing">
            <input onChange={(e) => setHearing(e.target.value)} />
          </Field>
        )}
      </div>
      <Field label="Your goals / concerns">
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="row">
        <button
          className="btn primary"
          disabled={!aiReady || s.busy || !hearing.trim()}
          onClick={() => s.run("/api/hearing-prep", { caseContext: caseContext(c), hearing, notes })}
        >
          {s.busy ? "Preparing…" : "Prepare me"}
        </button>
        {s.busy && (
          <button className="btn" onClick={s.stop}>
            Stop
          </button>
        )}
        {s.out && !s.busy && (
          <button className="btn" onClick={() => saveAsNote(c, `Hearing prep: ${hearing}`, s.out)}>
            Save to notes
          </button>
        )}
      </div>
      {s.out && (
        <div className="subcard">
          <Markdown text={s.out} />
        </div>
      )}
    </Section>
  );
}
