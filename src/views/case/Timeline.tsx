import { useState } from "react";
import type { Case, TimelineEvent } from "../../lib/types";
import { updateCase } from "../../lib/store";
import { uid } from "../../lib/id";
import { downloadDoc, slug } from "../../lib/download";
import { Empty, Field, Section } from "../../components/ui";
import { fmt } from "../../lib/dates";
import { caseNo } from "../../lib/courts";

export function Timeline({ c }: { c: Case }) {
  const [form, setForm] = useState<Omit<TimelineEvent, "id">>({ date: "", title: "", description: "", evidenceIds: [] });
  const save = (timeline: TimelineEvent[]) => updateCase(c.id, (x) => ({ ...x, timeline }));
  const sorted = [...c.timeline].sort((a, b) => a.date.localeCompare(b.date));
  const exhibit = new Map(c.annexures.map((e) => [e.id, e]));

  const exportTimeline = () =>
    downloadDoc(
      `${slug(c.title)}-timeline`,
      [
        `# LIST OF DATES AND EVENTS`,
        `**${c.title}**${caseNo(c) ? ` — ${caseNo(c)}` : ""}`,
        "",
        ...sorted.map((t) => {
          const refs = t.evidenceIds.map((id) => exhibit.get(id)?.label).filter(Boolean);
          return `**${fmt(t.date)}** — ${t.title}${t.description ? `. ${t.description}` : ""}${refs.length ? ` (Annexure ${refs.join(", ")})` : ""}`;
        }),
      ].join("\n\n"),
    );

  return (
    <div className="stack">
      <Section
        title="List of dates & events"
        actions={
          <button className="btn" disabled={!sorted.length} onClick={exportTimeline}>
            Export list of dates
          </button>
        }
      >
        {sorted.length === 0 ? (
          <Empty title="No events yet">Build the list of dates & events used in petitions, SLPs and written submissions.</Empty>
        ) : (
          <ol className="timeline">
            {sorted.map((t) => (
              <li key={t.id}>
                <div className="tl-date">{fmt(t.date)}</div>
                <div className="tl-body">
                  <strong>{t.title}</strong>
                  {t.description && <div className="small">{t.description}</div>}
                  {t.evidenceIds.length > 0 && (
                    <div className="row small">
                      {t.evidenceIds.map((id) => exhibit.get(id)).filter(Boolean).map((e) => (
                        <span key={e!.id} className="badge muted">
                          {e!.label}: {e!.title}
                        </span>
                      ))}
                    </div>
                  )}
                  <button className="link danger small" onClick={() => save(c.timeline.filter((x) => x.id !== t.id))}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Add an event">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.date || !form.title) return;
            save([...c.timeline, { ...form, id: uid() }]);
            setForm({ date: "", title: "", description: "", evidenceIds: [] });
          }}
        >
          <div className="form-grid">
            <Field label="Date">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="What happened">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
          </div>
          <Field label="Details">
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          {c.annexures.length > 0 && (
            <div className="field">
              <span className="field-label">Supporting annexures</span>
              <div className="chips">
                {c.annexures.map((ev) => {
                  const on = form.evidenceIds.includes(ev.id);
                  return (
                    <button
                      type="button"
                      key={ev.id}
                      className={on ? "chip on" : "chip"}
                      onClick={() =>
                        setForm({ ...form, evidenceIds: on ? form.evidenceIds.filter((x) => x !== ev.id) : [...form.evidenceIds, ev.id] })
                      }
                    >
                      {ev.label}: {ev.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <button className="btn primary">Add event</button>
        </form>
      </Section>
    </div>
  );
}
