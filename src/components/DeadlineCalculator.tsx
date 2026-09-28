import { useState } from "react";
import { computeDeadline, PRESETS, toISO } from "../lib/deadlines";
import { Field } from "./ui";

export function DeadlineCalculator({ onAdd }: { onAdd?: (date: string, title: string) => void }) {
  const [trigger, setTrigger] = useState(toISO(new Date()));
  const [days, setDays] = useState(21);
  const [mode, setMode] = useState<"calendar" | "court">("calendar");
  const [service, setService] = useState(0);
  const [holidays, setHolidays] = useState("");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");

  const result = trigger
    ? computeDeadline(trigger, {
        days,
        mode,
        serviceDays: service,
        extraHolidays: holidays.split(/[\s,]+/).filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)),
      })
    : null;

  return (
    <div className="stack">
      <Field label="Start from a common rule (optional)">
        <select
          value=""
          onChange={(e) => {
            const p = PRESETS[Number(e.target.value)];
            if (!p) return;
            setDays(p.days);
            setMode(p.mode);
            setLabel(p.label);
            setNote(p.note);
          }}
        >
          <option value="">Choose a preset…</option>
          {PRESETS.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      {note && <div className="hint">{note}</div>}
      <div className="form-grid">
        <Field label="Trigger date" hint="Date served, entered, or the hearing date">
          <input type="date" value={trigger} onChange={(e) => setTrigger(e.target.value)} />
        </Field>
        <Field label="Days" hint="Use a negative number for 'days before'">
          <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} />
        </Field>
        <Field label="Count">
          <select value={mode} onChange={(e) => setMode(e.target.value as "calendar" | "court")}>
            <option value="calendar">Calendar days</option>
            <option value="court">Court days (skip weekends & holidays)</option>
          </select>
        </Field>
        <Field label="Extra days for service" hint="e.g. 3 for mail (FRCP 6(d)); 5 in some states">
          <input type="number" min={0} value={service} onChange={(e) => setService(Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Extra court closure dates" hint="Local/state holidays as YYYY-MM-DD, separated by commas. Federal holidays are included automatically.">
        <input value={holidays} onChange={(e) => setHolidays(e.target.value)} placeholder="2026-03-31, 2026-11-27" />
      </Field>

      {result && (
        <div className="result">
          <div className="result-date">{new Date(result.date + "T00:00").toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
          <ol className="small">
            {result.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <div className="hint">Estimate only. Confirm with your court's rules — some courts count differently or have local holidays.</div>
          {onAdd && (
            <div className="inline-form">
              <input placeholder="Deadline title" value={label} onChange={(e) => setLabel(e.target.value)} />
              <button className="btn primary" onClick={() => onAdd(result.date, label || "Deadline")}>
                Add to case
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
