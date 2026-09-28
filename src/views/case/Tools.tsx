import { useRef, useState } from "react";
import type { Case, Note } from "../../lib/types";
import { updateCase } from "../../lib/store";
import { uid } from "../../lib/id";
import { streamPost, toUpload } from "../../lib/api";
import { caseContext } from "../../lib/context";
import { Markdown } from "../../components/Markdown";
import { AiGate } from "../../components/Gates";
import { Field, Section } from "../../components/ui";
import { fmt } from "../../lib/dates";

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
    const upload = file ? await toUpload(file) : { title: title || "Document", text };
    const body = { caseContext: caseContext(c), ...upload, title: title || upload.title };
    s.run("/api/analyze", body);
  };

  return (
    <Section title="Analyze a court document">
      <p className="muted small">
        Upload a plaint, petition, reply, notice, chargesheet or judgment (PDF, photo or text) to get a summary, the dates and limitation it triggers, and next steps.
      </p>
      <div className="form-grid">
        <Field label="Upload PDF, photo or text file">
          <input
            type="file"
            accept=".pdf,.txt,.md,text/*,application/pdf,image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f && !title) setTitle(f.name);
            }}
          />
        </Field>
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Counter affidavit of Respondent No. 2" />
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
  const hearings = c.hearings.filter((h) => !h.outcome).sort((a, b) => a.date.localeCompare(b.date)).map((h) => ({ id: h.id, title: h.purpose || "Hearing", date: fmt(h.date) }));
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
            <input value={hearing} onChange={(e) => setHearing(e.target.value)} placeholder="Admission hearing, final arguments, bail hearing…" />
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
