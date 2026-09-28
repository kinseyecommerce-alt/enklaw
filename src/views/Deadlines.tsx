import { useState } from "react";
import type { Case, Deadline } from "../lib/types";
import { updateCase } from "../lib/store";
import { uid } from "../lib/id";
import { daysUntil } from "../lib/deadlines";
import { toICS } from "../lib/ics";
import { downloadFile, slug } from "../lib/download";
import { DeadlineCalculator } from "../components/DeadlineCalculator";
import { DueBadge, Empty, Field, Section } from "../components/ui";

const blank = (): Omit<Deadline, "id"> => ({ title: "", date: "", time: "", kind: "deadline", location: "", notes: "", done: false });

export function Deadlines({ c }: { c: Case }) {
  const [form, setForm] = useState(blank());
  const [showCalc, setShowCalc] = useState(false);
  const save = (deadlines: Deadline[]) => updateCase(c.id, (x) => ({ ...x, deadlines }));
  const sorted = [...c.deadlines].sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date));

  return (
    <div className="stack">
      <Section
        title="Deadlines & hearings"
        actions={
          <>
            <button className="btn" onClick={() => setShowCalc((s) => !s)}>
              {showCalc ? "Hide calculator" : "Calculate a deadline"}
            </button>
            <button
              className="btn"
              disabled={!c.deadlines.length}
              onClick={() => downloadFile(`${slug(c.title)}-deadlines.ics`, toICS(c, c.deadlines.filter((d) => !d.done)), "text/calendar")}
            >
              Export to calendar (.ics)
            </button>
          </>
        }
      >
        {showCalc && (
          <div className="subcard">
            <DeadlineCalculator
              onAdd={(date, title) => {
                save([...c.deadlines, { ...blank(), id: uid(), date, title }]);
                setShowCalc(false);
              }}
            />
          </div>
        )}
        {sorted.length === 0 ? (
          <Empty title="No deadlines yet">Add response deadlines, hearing dates, and filing cutoffs so you never miss one.</Empty>
        ) : (
          <ul className="list">
            {sorted.map((d) => (
              <li key={d.id} className={`list-item ${d.done ? "done" : ""}`}>
                <input
                  type="checkbox"
                  checked={d.done}
                  onChange={() => save(c.deadlines.map((x) => (x.id === d.id ? { ...x, done: !x.done } : x)))}
                />
                <div className="grow">
                  <strong>{d.title}</strong>
                  <div className="muted small">
                    {d.date}
                    {d.time ? ` at ${d.time}` : ""} · {d.kind}
                    {d.location ? ` · ${d.location}` : ""}
                  </div>
                  {d.notes && <div className="small">{d.notes}</div>}
                </div>
                <DueBadge days={daysUntil(d.date)} done={d.done} />
                <button className="link danger" onClick={() => save(c.deadlines.filter((x) => x.id !== d.id))}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Add a deadline or hearing">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.title || !form.date) return;
            save([...c.deadlines, { ...form, id: uid() }]);
            setForm(blank());
          }}
        >
          <div className="form-grid">
            <Field label="Title">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="File answer to complaint" />
            </Field>
            <Field label="Type">
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Deadline["kind"] })}>
                <option value="deadline">Filing deadline</option>
                <option value="hearing">Hearing</option>
                <option value="trial">Trial</option>
                <option value="meeting">Meeting / mediation</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Date">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Time (optional)">
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </Field>
            <Field label="Location / department">
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
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
