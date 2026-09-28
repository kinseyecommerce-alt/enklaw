import { useState } from "react";
import type { Annexure, Case } from "../../lib/types";
import { updateCase } from "../../lib/store";
import { uid } from "../../lib/id";
import { annexurePrefix, caseNo } from "../../lib/courts";
import { fmt } from "../../lib/dates";
import { downloadDoc, slug } from "../../lib/download";
import { Empty, Field, Section } from "../../components/ui";

const KINDS: Annexure["kind"][] = ["document", "photo", "video", "audio", "message", "record", "other"];
const nextLabel = (c: Case, count = c.annexures.length) => `${annexurePrefix(c.side)}${count + 1}`;

export function Annexures({ c }: { c: Case }) {
  const blank = (count?: number): Omit<Annexure, "id"> => ({ label: nextLabel(c, count), title: "", kind: "document", date: "", source: "", description: "", relevance: "", fileName: "" });
  const [form, setForm] = useState(blank());
  const [editing, setEditing] = useState<string | null>(null);
  const save = (annexures: Annexure[]) => updateCase(c.id, (x) => ({ ...x, annexures }));

  const exportIndex = () =>
    downloadDoc(
      `${slug(c.title)}-index`,
      [
        `# INDEX`,
        `**${c.title}**${caseNo(c) ? ` — ${caseNo(c)}` : ""}`,
        c.court ?? "",
        "",
        "| Sl. No. | Particulars | Annexure | Date | Page No. |",
        "|---|---|---|---|---|",
        ...c.annexures.map((a, i) => `| ${i + 1} | ${a.title}${a.description ? ` — ${a.description}` : ""} | ${a.label} | ${fmt(a.date)} | |`),
      ].join("\n"),
    );

  return (
    <div className="stack">
      <Section
        title="Annexures & documents"
        actions={
          <button className="btn" disabled={!c.annexures.length} onClick={exportIndex}>
            Export index
          </button>
        }
      >
        {c.annexures.length === 0 ? (
          <Empty title="No annexures yet">List every document you rely on, with what it proves. Labels follow P-1 / R-1 convention.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Annexure</th>
                <th>Document</th>
                <th>Date</th>
                <th>What it proves</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {c.annexures.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.label}</strong>
                  </td>
                  <td>
                    {a.title}
                    {a.description && <div className="muted small">{a.description}</div>}
                    {a.fileName && <div className="muted small">📎 {a.fileName}</div>}
                  </td>
                  <td className="nowrap">{fmt(a.date)}</td>
                  <td className="small">{a.relevance}</td>
                  <td className="nowrap">
                    <button
                      className="link"
                      onClick={() => {
                        setEditing(a.id);
                        setForm({ ...a });
                      }}
                    >
                      Edit
                    </button>{" "}
                    <button className="link danger" onClick={() => save(c.annexures.filter((x) => x.id !== a.id))}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={editing ? "Edit annexure" : "Add annexure"}>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!form.title) return;
            const next = editing ? c.annexures.map((x) => (x.id === editing ? { ...form, id: editing } : x)) : [...c.annexures, { ...form, id: uid() }];
            save(next);
            setEditing(null);
            setForm(blank(next.length));
          }}
        >
          <div className="form-grid">
            <Field label="Label">
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </Field>
            <Field label="Document">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sale deed dated…" />
            </Field>
            <Field label="Type">
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Annexure["kind"] })}>
                {KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>
            <Field label="Date of document">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Original with">
              <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </Field>
            <Field label="File (name only)">
              <input type="file" onChange={(e) => setForm({ ...form, fileName: e.target.files?.[0]?.name ?? "" })} />
            </Field>
          </div>
          <Field label="Description">
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="What it proves">
            <textarea rows={2} value={form.relevance} onChange={(e) => setForm({ ...form, relevance: e.target.value })} />
          </Field>
          <div className="row">
            <button className="btn primary">{editing ? "Save changes" : "Add annexure"}</button>
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
