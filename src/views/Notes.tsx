import { useState } from "react";
import type { Case, Note } from "../lib/types";
import { updateCase } from "../lib/store";
import { uid } from "../lib/id";
import { Empty, Section } from "../components/ui";

export function Notes({ c }: { c: Case }) {
  const [activeId, setActiveId] = useState<string | null>(c.notes[0]?.id ?? null);
  const active = c.notes.find((n) => n.id === activeId);
  const save = (notes: Note[]) => updateCase(c.id, (x) => ({ ...x, notes }));
  const patch = (p: Partial<Note>) => active && save(c.notes.map((n) => (n.id === active.id ? { ...n, ...p, updatedAt: new Date().toISOString() } : n)));

  return (
    <div className="split">
      <Section
        title="Notes"
        actions={
          <button
            className="btn"
            onClick={() => {
              const n: Note = { id: uid(), title: "New note", body: "", updatedAt: new Date().toISOString() };
              save([n, ...c.notes]);
              setActiveId(n.id);
            }}
          >
            New
          </button>
        }
      >
        {c.notes.length === 0 ? (
          <Empty title="No notes">Keep call logs, questions for the clerk, and ideas here.</Empty>
        ) : (
          <ul className="list">
            {c.notes.map((n) => (
              <li key={n.id} className={`list-item clickable ${n.id === activeId ? "selected" : ""}`} onClick={() => setActiveId(n.id)}>
                <div>
                  <strong>{n.title}</strong>
                  <div className="muted small">{new Date(n.updatedAt).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section
        title={active ? "Edit note" : "Select a note"}
        actions={
          active && (
            <button
              className="link danger"
              onClick={() => {
                save(c.notes.filter((n) => n.id !== active.id));
                setActiveId(null);
              }}
            >
              Delete
            </button>
          )
        }
      >
        {active && (
          <div className="stack">
            <input value={active.title} onChange={(e) => patch({ title: e.target.value })} />
            <textarea rows={18} value={active.body} onChange={(e) => patch({ body: e.target.value })} />
          </div>
        )}
      </Section>
    </div>
  );
}
