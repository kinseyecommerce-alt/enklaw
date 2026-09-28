import { useState } from "react";
import { computeLimitation, PRESETS, type CourtCalendar, type Unit } from "../lib/limitation";
import { fmt, fmtLong, todayISO } from "../lib/dates";
import { Field, Section } from "../components/ui";

const CAL_KEY = "enklaw:calendar";

function loadCalendar(): CourtCalendar {
  try {
    const raw = localStorage.getItem(CAL_KEY);
    if (raw) return JSON.parse(raw) as CourtCalendar;
  } catch {
    // ignore
  }
  return { saturdays: "2nd4th", closures: [] };
}

export function Limitation() {
  const [from, setFrom] = useState(todayISO());
  const [period, setPeriod] = useState(90);
  const [unit, setUnit] = useState<Unit>("days");
  const [note, setNote] = useState("");
  const [copyApplied, setCopyApplied] = useState("");
  const [copyReady, setCopyReady] = useState("");
  const [cal, setCal] = useState<CourtCalendar>(loadCalendar);

  const updateCal = (next: CourtCalendar) => {
    setCal(next);
    try {
      localStorage.setItem(CAL_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const result = from && period > 0 ? computeLimitation({ from, period, unit, copyApplied, copyReady, calendar: cal }) : null;
  const groups = [...new Set(PRESETS.map((p) => p.group))];

  return (
    <div className="page narrow">
      <h1>Limitation calculator</h1>
      <p className="muted">
        Computes the last day under the Limitation Act, 1963: the first day is excluded (s.12(1)), time for obtaining a certified copy is excluded
        (s.12(2)), and if the court is closed on the last day you may file on the day it reopens (s.4).
      </p>
      <Section title="Calculate">
        <Field label="Common periods">
          <select
            value=""
            onChange={(e) => {
              const p = PRESETS[Number(e.target.value)];
              if (!p) return;
              setPeriod(p.period);
              setUnit(p.unit);
              setNote(`${p.label}: ${p.note}`);
            }}
          >
            <option value="">Choose…</option>
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {PRESETS.map((p, i) =>
                  p.group === g ? (
                    <option key={p.label} value={i}>
                      {p.label} — {p.period} {p.unit}
                    </option>
                  ) : null,
                )}
              </optgroup>
            ))}
          </select>
        </Field>
        {note && <div className="hint">{note}</div>}
        <div className="form-grid">
          <Field label="Period starts from" hint="Date of judgment / order / service / cause of action">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Period">
            <div className="row nowrap-row">
              <input type="number" min={1} value={period} onChange={(e) => setPeriod(Number(e.target.value))} />
              <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
                <option value="days">days</option>
                <option value="months">months</option>
                <option value="years">years</option>
              </select>
            </div>
          </Field>
          <Field label="Certified copy applied on" hint="Optional (s.12(2))">
            <input type="date" value={copyApplied} onChange={(e) => setCopyApplied(e.target.value)} />
          </Field>
          <Field label="Certified copy ready on">
            <input type="date" value={copyReady} onChange={(e) => setCopyReady(e.target.value)} />
          </Field>
        </div>

        {result && (
          <div className="result">
            <div className="muted small">Last day to file</div>
            <div className="result-date">
              {fmt(result.lastDay)} — {fmtLong(result.lastDay)}
            </div>
            <ol className="small">
              {result.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <div className="hint">
              Estimate only. Check the governing Article / special statute, whether the period runs from the order or its communication, and s.5
              (condonation of delay) where applicable.
            </div>
          </div>
        )}
      </Section>

      <Section title="Court calendar">
        <Field label="Saturdays">
          <select value={cal.saturdays} onChange={(e) => updateCal({ ...cal, saturdays: e.target.value as CourtCalendar["saturdays"] })}>
            <option value="2nd4th">2nd & 4th Saturdays closed</option>
            <option value="all">All Saturdays closed</option>
            <option value="none">Open on Saturdays</option>
          </select>
        </Field>
        <Field
          label="Holidays & vacations"
          hint="One per line: a date (2026-11-08) or a range (2026-06-01 to 2026-06-30). Sundays, 26 Jan, 15 Aug and 2 Oct are included automatically. Copy the rest from your court's holiday list."
        >
          <textarea rows={6} className="mono" value={cal.closures.join("\n")} onChange={(e) => updateCal({ ...cal, closures: e.target.value.split("\n") })} />
        </Field>
      </Section>
    </div>
  );
}
