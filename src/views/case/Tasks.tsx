import { useState } from "react";
import type { Case, Task } from "../../lib/types";
import { updateCase } from "../../lib/store";
import { uid } from "../../lib/id";
import { daysUntil, fmt } from "../../lib/dates";
import { DueBadge, Empty, Field, Section } from "../../components/ui";

export function Tasks({ c }: { c: Case }) {
  const [form, setForm] = useState<Omit<Task, "id" | "done">>({ title: "", due: "", notes: "" });
  const save = (tasks: Task[]) => updateCase(c.id, (x) => ({ ...x, tasks }));
  const sorted = [...c.tasks].sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));

  return (
    <div className="stack">
      <Section title="Compliances & tasks">
        {sorted.length === 0 ? (
          <Empty title="Nothing pending">Add court directions (file reply in 4 weeks, deposit amount, serve respondent) and filing deadlines.</Empty>
        ) : (
          <ul className="list">
            {sorted.map((t) => (
              <li key={t.id} className={`list-item ${t.done ? "done" : ""}`}>
                <input type="checkbox" checked={t.done} onChange={() => save(c.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))} />
                <div className="grow">
                  <strong>{t.title}</strong>
                  <div className="muted small">
                    Due {fmt(t.due)}
                    {t.notes ? ` · ${t.notes}` : ""}
                  </div>
                </div>
                <DueBadge days={daysUntil(t.due)} done={t.done} />
                <button className="link danger" onClick={() => save(c.tasks.filter((x) => x.id !== t.id))}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Add a task">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.title || !form.due) return;
            save([...c.tasks, { ...form, id: uid(), done: false }]);
            setForm({ title: "", due: "", notes: "" });
          }}
        >
          <div className="form-grid">
            <Field label="Task">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="File counter affidavit" />
            </Field>
            <Field label="Due date">
              <input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
            </Field>
            <Field label="Notes">
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <button className="btn primary">Add</button>
        </form>
      </Section>
    </div>
  );
}
