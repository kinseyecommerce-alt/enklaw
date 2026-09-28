import { useState } from "react";
import type { Case, Evidence } from "../lib/types";
import { updateCase } from "../lib/store";
import { uid } from "../lib/id";
import { downloadDoc, slug } from "../lib/download";
import { Empty, Field, Section } from "../components/ui";

const KINDS: Evidence["kind"][] = ["document", "photo", "video", "audio", "message", "record", "other"];

/** Next exhibit label: numbers for plaintiffs/petitioners, letters for defendants (a common court convention). */
function exhibitLabel(role: Case["myRole"], n: number): string {
  const letters = role === "Defendant" || role === "Respondent" || role === "Appellee";
  if (!letters) return String(n + 1);
  let s = "";
  let i = n;
  do {
    s = String.fromCharCode(65 + (i % 26)) + s;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return s;
}

const nextExhibit = (c: Case, count = c.evidence.length) => exhibitLabel(c.myRole, count);

export function EvidenceView({ c }: { c: Case }) {
  const blank = (): Omit<Evidence, "id"> => ({ exhibit: nextExhibit(c), title: "", kind: "document", date: "", source: "", description: "", relevance: "", fileName: "" });
  const [form, setForm] = useState(blank());
  const [editing, setEditing] = useState<string | null>(null);
  const save = (evidence: Evidence[]) => updateCase(c.id, (x) => ({ ...x, evidence }));

  const exhibitList = () => {
    const md = [
      `# EXHIBIT LIST`,
      `**${c.title}**${c.caseNumber ? ` — Case No. ${c.caseNumber}` : ""}`,
      c.court ?? "",
      "",
      "| Exhibit | Description | Date | Source |",
      "|---|---|---|---|",
      ...c.evidence.map((e) => `| ${e.exhibit} | ${e.title}${e.description ? ` — ${e.description}` : ""} | ${e.date ?? ""} | ${e.source ?? ""} |`),
    ].join("\n");
    downloadDoc(`${slug(c.title)}-exhibit-list`, md);
  };

  return (
    <div className="stack">
      <Section
        title="Evidence & exhibits"
        actions={
          <button className="btn" disabled={!c.evidence.length} onClick={exhibitList}>
            Export exhibit list
          </button>
        }
      >
        {c.evidence.length === 0 ? (
          <Empty title="No evidence logged">Log every document, photo, text message and record, and note why it matters.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Exh.</th>
                <th>Title</th>
                <th>Type</th>
                <th>Date</th>
                <th>Why it matters</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {c.evidence.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.exhibit}</strong>
                  </td>
                  <td>
                    {e.title}
                    {e.description && <div className="muted small">{e.description}</div>}
                    {e.fileName && <div className="muted small">📎 {e.fileName}</div>}
                  </td>
                  <td>{e.kind}</td>
                  <td>{e.date}</td>
                  <td className="small">{e.relevance}</td>
                  <td className="nowrap">
                    <button
                      className="link"
                      onClick={() => {
                        setEditing(e.id);
                        setForm({ ...e });
                      }}
                    >
                      Edit
                    </button>{" "}
                    <button className="link danger" onClick={() => save(c.evidence.filter((x) => x.id !== e.id))}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={editing ? "Edit exhibit" : "Log new evidence"}>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!form.title) return;
            const next = editing
              ? c.evidence.map((x) => (x.id === editing ? { ...form, id: editing } : x))
              : [...c.evidence, { ...form, id: uid() }];
            save(next);
            setEditing(null);
            setForm({ ...blank(), exhibit: nextExhibit(c, next.length) });
          }}
        >
          <div className="form-grid">
            <Field label="Exhibit #">
              <input value={form.exhibit} onChange={(e) => setForm({ ...form, exhibit: e.target.value })} />
            </Field>
            <Field label="Title">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Lease agreement" />
            </Field>
            <Field label="Type">
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Evidence["kind"] })}>
                {KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>
            <Field label="Date of evidence">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Source / who has the original">
              <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </Field>
            <Field label="File (name only — keep originals safe)">
              <input type="file" onChange={(e) => setForm({ ...form, fileName: e.target.files?.[0]?.name ?? "" })} />
            </Field>
          </div>
          <Field label="Description">
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Why it matters / what it proves">
            <textarea rows={2} value={form.relevance} onChange={(e) => setForm({ ...form, relevance: e.target.value })} />
          </Field>
          <div className="row">
            <button className="btn primary">{editing ? "Save changes" : "Add exhibit"}</button>
            {editing && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setEditing(null);
                  setForm(blank());
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </Section>
    </div>
  );
}
