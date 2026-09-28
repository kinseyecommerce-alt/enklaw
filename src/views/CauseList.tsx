import { Fragment, useState } from "react";
import type { Case } from "../lib/types";
import { causeList, dateAwaited, notUpdated } from "../lib/diary";
import { caseNo, courtShort } from "../lib/courts";
import { addDays, fmt, fmtLong, todayISO, daysUntil } from "../lib/dates";
import { toICS } from "../lib/ics";
import { downloadFile, printMarkdown } from "../lib/download";
import { HearingUpdateForm } from "../components/HearingUpdateForm";
import { DueBadge, Empty, Section } from "../components/ui";

export function CauseList({ cases, openCase }: { cases: Case[]; openCase: (id: string, tab?: "hearings") => void }) {
  const [date, setDate] = useState(todayISO());
  const [editing, setEditing] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const today = todayISO();
  const list = causeList(cases, date);
  const stale = cases.flatMap((c) => notUpdated(c, today).map((h) => ({ c, h }))).sort((a, b) => b.h.date.localeCompare(a.h.date));
  const awaited = dateAwaited(cases, today);
  const tasks = cases
    .flatMap((c) => c.tasks.filter((t) => !t.done).map((t) => ({ c, t })))
    .filter(({ t }) => daysUntil(t.due) <= 7)
    .sort((a, b) => a.t.due.localeCompare(b.t.due));
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d) => ({ d, n: causeList(cases, d).length }));

  const boardText = () =>
    [
      `*Cause list — ${fmt(date)}*`,
      ...list.map(({ c, h }, i) =>
        `${i + 1}. ${caseNo(c) || c.title}${h.itemNo ? ` | Item ${h.itemNo}` : ""}${h.courtHall ? ` | Court ${h.courtHall}` : ""}\n   ${c.title} — ${c.court ?? courtShort(c.courtType)}${h.purpose ? ` — ${h.purpose}` : ""}`,
      ),
    ].join("\n");

  return (
    <div className="page">
      <div className="row between">
        <div>
          <div className="eyebrow">{greeting()}</div>
          <h1>Cause list</h1>
        </div>
        <div className="row">
          <button className="btn" onClick={() => downloadFile("enklaw-hearings.ics", toICS(cases, today), "text/calendar")} disabled={!cases.length}>
            Export to calendar
          </button>
        </div>
      </div>

      <div className="stats">
        <button className="stat" style={{ ["--tone" as string]: "var(--accent)" }} onClick={() => setDate(today)}>
          <span className="num">{causeList(cases, today).length}</span>
          <span className="lbl">Listed today</span>
        </button>
        <button className="stat" style={{ ["--tone" as string]: "var(--bad)" }} onClick={() => document.getElementById("stale")?.scrollIntoView({ behavior: "smooth" })}>
          <span className="num">{stale.length}</span>
          <span className="lbl">Not updated</span>
        </button>
        <button className="stat" style={{ ["--tone" as string]: "var(--gold)" }} onClick={() => document.getElementById("tasks")?.scrollIntoView({ behavior: "smooth" })}>
          <span className="num">{tasks.length}</span>
          <span className="lbl">Compliances this week</span>
        </button>
        <button className="stat" style={{ ["--tone" as string]: "var(--ok)" }}>
          <span className="num">{cases.filter((c) => c.status !== "disposed").length}</span>
          <span className="lbl">Pending cases</span>
        </button>
      </div>

      <div className="week">
        {week.map(({ d, n }) => (
          <button key={d} className={`day ${d === date ? "active" : ""}`} onClick={() => setDate(d)}>
            <span className="small">{new Date(d + "T00:00").toLocaleDateString("en-IN", { weekday: "short" })}</span>
            <strong>{d.slice(8)}</strong>
            <span className={`count ${n ? "has" : ""}`}>{n}</span>
          </button>
        ))}
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </div>

      <Section
        title={`${fmtLong(date)} — ${list.length} ${list.length === 1 ? "matter" : "matters"}`}
        actions={
          list.length > 0 && (
            <>
              <button
                className="btn"
                onClick={async () => {
                  await navigator.clipboard.writeText(boardText());
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copied" : "Copy for WhatsApp"}
              </button>
              <button className="btn" onClick={() => printMarkdown(`Cause list ${fmt(date)}`, boardText().replace(/\*/g, "**").replace(/\n/g, "\n\n"))}>
                Print
              </button>
            </>
          )
        }
      >
        {list.length === 0 ? (
          <Empty title="No matters listed">Add hearing dates inside a case, or record a next date when you update a hearing.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Case</th>
                <th>Forum / court hall</th>
                <th>Purpose</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map(({ c, h }) => (
                <Fragment key={h.id}>
                  <tr className="clickable" onClick={() => openCase(c.id, "hearings")}>
                    <td className="item">{h.itemNo || "–"}</td>
                    <td>
                      <strong>{caseNo(c) || "—"}</strong>
                      <div className="small">{c.title}</div>
                      {c.client.name && <div className="muted small">Client: {c.client.name}</div>}
                    </td>
                    <td className="small">
                      <span className="badge muted">{courtShort(c.courtType)}</span> {c.court}
                      {h.courtHall && <div>Court No. {h.courtHall}</div>}
                    </td>
                    <td className="small">{h.purpose}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {h.outcome ? (
                        <span className="small">
                          {h.outcome}
                          {h.nextDate && <div className="muted">Next: {fmt(h.nextDate)}</div>}
                        </span>
                      ) : (
                        <button className="btn small-btn" onClick={() => setEditing(editing === h.id ? null : h.id)}>
                          Update
                        </button>
                      )}
                    </td>
                  </tr>
                  {editing === h.id && (
                    <tr>
                      <td colSpan={5}>
                        <HearingUpdateForm c={c} h={h} onDone={() => setEditing(null)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <div className="grid-2">
        <div id="stale">
        <Section title={`Not updated (${stale.length})`}>
          {stale.length === 0 ? (
            <Empty title="All hearings updated" />
          ) : (
            <ul className="list">
              {stale.slice(0, 30).map(({ c, h }) => (
                <li key={h.id} className="list-item top">
                  <div className="grow">
                    <strong>{caseNo(c) || c.title}</strong> <span className="muted small">{fmt(h.date)}</span>
                    <div className="small">{c.title}</div>
                    {editing === h.id && <HearingUpdateForm c={c} h={h} onDone={() => setEditing(null)} />}
                  </div>
                  {editing !== h.id && (
                    <button className="btn small-btn" onClick={() => setEditing(h.id)}>
                      Update
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        </div>
        <div className="stack" id="tasks">
          <Section title={`Compliances due this week (${tasks.length})`}>
            {tasks.length === 0 ? (
              <Empty title="Nothing due" />
            ) : (
              <ul className="list">
                {tasks.map(({ c, t }) => (
                  <li key={t.id} className="list-item clickable" onClick={() => openCase(c.id)}>
                    <div>
                      <strong>{t.title}</strong>
                      <div className="muted small">
                        {fmt(t.due)} · {caseNo(c) || c.title}
                      </div>
                    </div>
                    <DueBadge days={daysUntil(t.due)} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title={`Date awaited (${awaited.length})`}>
            {awaited.length === 0 ? (
              <Empty title="Every pending case has a next date" />
            ) : (
              <ul className="list">
                {awaited.map((c) => (
                  <li key={c.id} className="list-item clickable" onClick={() => openCase(c.id, "hearings")}>
                    <div>
                      <strong>{caseNo(c) || c.title}</strong>
                      <div className="muted small">
                        {c.title} · {courtShort(c.courtType)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${part} · ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}`;
}
