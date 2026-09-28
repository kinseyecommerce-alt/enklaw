import { useState } from "react";
import type { Case, Hearing } from "../lib/types";
import { updateCase } from "../lib/store";
import { recordHearing } from "../lib/diary";
import { uid } from "../lib/id";
import { STAGES } from "../lib/courts";
import { addDays } from "../lib/dates";

const QUICK = ["Adjourned", "Not reached", "Notice issued", "Reply filed", "Arguments heard", "Part heard", "Evidence recorded", "Judgment reserved", "Disposed"];

export function HearingUpdateForm({ c, h, onDone }: { c: Case; h: Hearing; onDone?: () => void }) {
  const [outcome, setOutcome] = useState(h.outcome ?? "");
  const [nextDate, setNextDate] = useState(h.nextDate ?? "");
  const [nextPurpose, setNextPurpose] = useState(h.purpose ?? "");
  const [disposed, setDisposed] = useState(false);

  return (
    <form
      className="update-form"
      onSubmit={(e) => {
        e.preventDefault();
        updateCase(c.id, (x) => recordHearing(x, h.id, { outcome, nextDate, nextPurpose, disposed }, uid));
        onDone?.();
      }}
    >
      <div className="chips">
        {QUICK.map((q) => (
          <button
            type="button"
            key={q}
            className={outcome === q ? "chip on" : "chip"}
            onClick={() => {
              setOutcome(q);
              setDisposed(q === "Disposed");
            }}
          >
            {q}
          </button>
        ))}
      </div>
      <input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="What happened (business / proceedings)" />
      <div className="form-grid">
        <label className="field">
          <span className="field-label">Next date</span>
          <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} disabled={disposed} />
          <span className="row small">
            {[7, 14, 28, 56].map((d) => (
              <button type="button" key={d} className="link" disabled={disposed} onClick={() => setNextDate(addDays(h.date, d))}>
                +{d / 7}w
              </button>
            ))}
          </span>
        </label>
        <label className="field">
          <span className="field-label">Purpose of next date</span>
          <input list="stages" value={nextPurpose} onChange={(e) => setNextPurpose(e.target.value)} disabled={disposed} />
          <datalist id="stages">
            {STAGES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={disposed} onChange={(e) => setDisposed(e.target.checked)} /> Case finally disposed at this hearing
      </label>
      <div className="row">
        <button className="btn primary" disabled={!outcome.trim()}>
          Save
        </button>
        {onDone && (
          <button type="button" className="btn" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
