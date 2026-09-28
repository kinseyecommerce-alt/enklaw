import { useState } from "react";
import type { Case } from "../lib/types";
import type { Health } from "../lib/api";
import { getServer, setServer } from "../lib/server";
import { enableReminders, getReminderSettings, isNative, setReminderSettings, syncReminders } from "../lib/native";
import { Field, Section } from "./ui";

/** Server address + access code. Required by the phone apps; optional on the web. */
export function ServerSection({ health, onChange }: { health: Health | null; onChange: () => void }) {
  const [s, setS] = useState(getServer);
  const [msg, setMsg] = useState("");
  const native = isNative();

  return (
    <Section title="EnkLaw server">
      <p className="small muted">
        {native
          ? "The phone app keeps your diary on this phone. AI, drafting and judgment search run on your EnkLaw server — enter its address and access code."
          : "Leave empty when EnkLaw runs from this computer. Enter an address only to use a server hosted elsewhere."}
      </p>
      <div className="form-grid">
        <Field label="Server address" hint="e.g. https://enklaw.yourdomain.in">
          <input id="server-url" value={s.url} onChange={(e) => setS({ ...s, url: e.target.value })} placeholder={native ? "https://…" : "(this computer)"} inputMode="url" autoCapitalize="off" />
        </Field>
        <Field label="Access code" hint="ENKLAW_ACCESS_TOKEN on the server">
          <input id="server-token" type="password" value={s.token} onChange={(e) => setS({ ...s, token: e.target.value })} autoCapitalize="off" />
        </Field>
      </div>
      <div className="row">
        <button
          className="btn primary"
          onClick={() => {
            setServer(s);
            setMsg("Saved. Checking connection…");
            onChange();
          }}
        >
          Save & test
        </button>
        <span className="small">
          {health == null ? (
            <span className="badge bad">Not reachable</span>
          ) : health.authOk === false ? (
            <span className="badge warn">Wrong access code</span>
          ) : (
            <span className="badge ok">Connected</span>
          )}{" "}
          {msg && health == null ? "Check the address and that the server is running." : ""}
        </span>
      </div>
    </Section>
  );
}

/** Hearing and compliance reminders (phone apps only). */
export function RemindersSection({ cases }: { cases: Case[] }) {
  const [r, setR] = useState(getReminderSettings);
  const [msg, setMsg] = useState("");
  if (!isNative()) return null;

  const apply = async (next: typeof r) => {
    if (next.enabled && !r.enabled && !(await enableReminders())) {
      setMsg("Notifications are blocked. Allow them for EnkLaw in your phone's settings.");
      return;
    }
    setR(next);
    setReminderSettings(next);
    const n = await syncReminders(cases);
    setMsg(next.enabled ? `${n} reminders scheduled for the next 60 days.` : "Reminders turned off.");
  };

  return (
    <Section title="Hearing reminders">
      <label className="check">
        <input id="rem-on" type="checkbox" checked={r.enabled} onChange={(e) => apply({ ...r, enabled: e.target.checked })} /> Notify me about listed
        matters and compliances due
      </label>
      {r.enabled && (
        <div className="form-grid">
          <Field label="Evening before at">
            <input id="rem-eve" type="time" value={r.eveningBefore} onChange={(e) => apply({ ...r, eveningBefore: e.target.value })} />
          </Field>
          <Field label="Morning of hearing at">
            <input id="rem-morn" type="time" value={r.morningOf} onChange={(e) => apply({ ...r, morningOf: e.target.value })} />
          </Field>
        </div>
      )}
      {msg && <div className="hint">{msg}</div>}
    </Section>
  );
}
