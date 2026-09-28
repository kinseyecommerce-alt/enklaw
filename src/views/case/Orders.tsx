import { useState } from "react";
import type { Case, Order } from "../../lib/types";
import { updateCase } from "../../lib/store";
import { uid } from "../../lib/id";
import { readOrder, toUpload, type OrderExtract } from "../../lib/api";
import { caseContext } from "../../lib/context";
import { applyOrder } from "../../lib/orders";
import { fmt } from "../../lib/dates";
import { AiGate } from "../../components/Gates";
import { Empty, Field, Section } from "../../components/ui";

export function Orders({ c, aiReady }: { c: Case; aiReady: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<OrderExtract | null>(null);
  const [manual, setManual] = useState<Omit<Order, "id">>({ date: "", title: "", summary: "", link: "" });
  const save = (orders: Order[]) => updateCase(c.id, (x) => ({ ...x, orders }));
  const sorted = [...c.orders].sort((a, b) => b.date.localeCompare(a.date));

  const read = async () => {
    setBusy(true);
    setError("");
    try {
      const upload = file ? await toUpload(file) : { title: "Pasted order", text };
      setDraft(await readOrder(caseContext(c), upload));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  const set = <K extends keyof OrderExtract>(k: K, v: OrderExtract[K]) => draft && setDraft({ ...draft, [k]: v });

  return (
    <div className="stack">
      <Section title="Read an order with AI">
        {!aiReady && <AiGate />}
        <p className="muted small">
          Upload the order or proceeding sheet (PDF or photo) downloaded from eCourts / the court website. EnkLaw reads it and fills in the outcome, next
          date and compliances for you to confirm.
        </p>
        <div className="form-grid">
          <Field label="Order file (PDF, JPG, PNG)">
            <input type="file" accept="application/pdf,image/*,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
        </div>
        {!file && (
          <Field label="…or paste the order text">
            <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        )}
        <button className="btn primary" disabled={!aiReady || busy || (!file && !text.trim())} onClick={read}>
          {busy ? "Reading order…" : "Read order"}
        </button>
        {error && <div className="notice">{error}</div>}

        {draft && (
          <div className="subcard stack">
            <strong>Check and apply to the diary</strong>
            <div className="form-grid">
              <Field label="Order date">
                <input type="date" value={draft.order_date} onChange={(e) => set("order_date", e.target.value)} />
              </Field>
              <Field label="Title">
                <input value={draft.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <Field label="Next date" hint={draft.next_date_note}>
                <input type="date" value={draft.next_date} onChange={(e) => set("next_date", e.target.value)} />
              </Field>
              <Field label="Purpose of next date">
                <input value={draft.next_purpose} onChange={(e) => set("next_purpose", e.target.value)} />
              </Field>
            </div>
            <Field label="Diary entry (what happened)">
              <input value={draft.outcome} onChange={(e) => set("outcome", e.target.value)} />
            </Field>
            <Field label="Summary">
              <textarea rows={3} value={draft.summary} onChange={(e) => set("summary", e.target.value)} />
            </Field>
            {draft.compliances.length > 0 && (
              <div className="field">
                <span className="field-label">Compliances to add as tasks</span>
                {draft.compliances.map((t, i) => (
                  <div key={i} className="inline-form">
                    <input
                      value={t.task}
                      onChange={(e) => set("compliances", draft.compliances.map((x, j) => (j === i ? { ...x, task: e.target.value } : x)))}
                    />
                    <input
                      type="date"
                      value={t.due_date}
                      onChange={(e) => set("compliances", draft.compliances.map((x, j) => (j === i ? { ...x, due_date: e.target.value } : x)))}
                    />
                    <button type="button" className="link danger" onClick={() => set("compliances", draft.compliances.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="check">
              <input type="checkbox" checked={draft.disposed} onChange={(e) => set("disposed", e.target.checked)} /> This order finally disposes of the case
            </label>
            <div className="row">
              <button
                className="btn primary"
                onClick={() => {
                  updateCase(c.id, (x) => applyOrder(x, draft, file?.name, uid));
                  setDraft(null);
                  setFile(null);
                  setText("");
                }}
              >
                Apply to diary
              </button>
              <button className="btn" onClick={() => setDraft(null)}>
                Discard
              </button>
            </div>
          </div>
        )}
      </Section>

      <Section title={`Orders (${c.orders.length})`}>
        {sorted.length === 0 ? (
          <Empty title="No orders yet" />
        ) : (
          <ul className="list">
            {sorted.map((o) => (
              <li key={o.id} className="list-item top">
                <div className="entry-no">{fmt(o.date)}</div>
                <div className="grow">
                  <strong>{o.title}</strong>
                  {o.summary && <div className="small">{o.summary}</div>}
                  <div className="row small muted">
                    {o.fileName && <span>📎 {o.fileName}</span>}
                    {o.link && (
                      <a href={o.link} target="_blank" rel="noreferrer">
                        Open ↗
                      </a>
                    )}
                  </div>
                </div>
                <button className="link danger" onClick={() => save(c.orders.filter((x) => x.id !== o.id))}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Add an order manually">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!manual.date || !manual.title) return;
            save([...c.orders, { ...manual, id: uid() }]);
            setManual({ date: "", title: "", summary: "", link: "" });
          }}
        >
          <div className="form-grid">
            <Field label="Date">
              <input type="date" value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} />
            </Field>
            <Field label="Title">
              <input value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} placeholder="Interim stay granted" />
            </Field>
            <Field label="Link (optional)">
              <input value={manual.link} onChange={(e) => setManual({ ...manual, link: e.target.value })} placeholder="https://…" />
            </Field>
          </div>
          <Field label="Summary">
            <textarea rows={2} value={manual.summary} onChange={(e) => setManual({ ...manual, summary: e.target.value })} />
          </Field>
          <button className="btn">Add order</button>
        </form>
      </Section>
    </div>
  );
}
