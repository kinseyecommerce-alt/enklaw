import { useState } from "react";
import type { Case, Hearing } from "../../lib/types";
import { updateCase } from "../../lib/store";
import { uid } from "../../lib/id";
import { STAGES } from "../../lib/courts";
import { fmt, todayISO } from "../../lib/dates";
import { HearingUpdateForm } from "../../components/HearingUpdateForm";
import { Empty, Field, Section } from "../../components/ui";

export function Hearings({ c }: { c: Case }) {
  const [form, setForm] = useState<Omit<Hearing, "id">>({ date: "", purpose: c.stage ?? "", courtHall: "", itemNo: "", judge: c.judge ?? "" });
  const [editing, setEditing] = useState<string | null>(null);
  const today = todayISO();
  const sorted = [...c.hearings].sort((a, b) => b.date.localeCompare(a.date));
  const save = (hearings: Hearing[]) => updateCase(c.id, (x) => ({ ...x, hearings }));

  return (
    <div className="stack">
      <Section title="Add a hearing date">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.date) return;
            save([...c.hearings, { ...form, id: uid() }]);
            setForm({ ...form, date: "", itemNo: "" });
          }}
        >
          <div className="form-grid">
            <Field label="Date">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Purpose / stage">
              <input list="stages-h" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
              <datalist id="stages-h">
                {STAGES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <Field label="Court no. / hall">
              <input value={form.courtHall} onChange={(e) => setForm({ ...form, courtHall: e.target.value })} />
            </Field>
            <Field label="Item no.">
              <input value={form.itemNo} onChange={(e) => setForm({ ...form, itemNo: e.target.value })} />
            </Field>
            <Field label="Judge / bench">
              <input value={form.judge} onChange={(e) => setForm({ ...form, judge: e.target.value })} />
            </Field>
          </div>
          <button className="btn primary">Add hearing</button>
        </form>
      </Section>

      <Section title={`Hearing history (${c.hearings.length})`}>
        {sorted.length === 0 ? (
          <Empty title="No hearings yet">Add the next date above. After each hearing, record what happened and the next date.</Empty>
        ) : (
          <ol className="timeline">
            {sorted.map((h) => (
              <li key={h.id}>
                <div className="tl-date">
                  {fmt(h.date)}
                  {!h.outcome && h.date >= today && <div className="badge warn">upcoming</div>}
                  {!h.outcome && h.date < today && <div className="badge bad">not updated</div>}
                </div>
                <div className="tl-body">
                  <div className="small muted">
                    {[h.purpose, h.courtHall && `Court ${h.courtHall}`, h.itemNo && `Item ${h.itemNo}`, h.judge].filter(Boolean).join(" · ")}
                  </div>
                  {h.outcome && <strong>{h.outcome}</strong>}
                  {h.nextDate && <div className="small">Next date: {fmt(h.nextDate)}</div>}
                  {editing === h.id ? (
                    <HearingUpdateForm c={c} h={h} onDone={() => setEditing(null)} />
                  ) : (
                    <div className="row small">
                      <button className="link" onClick={() => setEditing(h.id)}>
                        {h.outcome ? "Edit outcome" : "Record outcome"}
                      </button>
                      <button className="link danger" onClick={() => confirm("Delete this hearing?") && save(c.hearings.filter((x) => x.id !== h.id))}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
