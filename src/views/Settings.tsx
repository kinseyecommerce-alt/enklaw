import { useState } from "react";
import type { Health } from "../lib/api";
import { exportData, importData } from "../lib/store";
import { downloadFile } from "../lib/download";
import { Section } from "../components/ui";

export function Settings({ health }: { health: Health | null }) {
  const [msg, setMsg] = useState("");
  return (
    <div className="page narrow">
      <h1>Settings & backup</h1>
      <Section title="AI connection">
        {health == null ? (
          <p>
            The EnkLaw server is not reachable. Start it with <code>npm run dev</code>.
          </p>
        ) : health.aiConfigured ? (
          <p>
            Connected. Model: <code>{health.model}</code>
          </p>
        ) : (
          <p>
            No API key found. Copy <code>.env.example</code> to <code>.env</code>, set <code>ANTHROPIC_API_KEY</code>, and restart the server.
          </p>
        )}
      </Section>
      <Section title="Backup your data">
        <p className="muted">
          Your cases are stored only in this browser. Export a backup regularly — clearing browser data will erase them.
        </p>
        <div className="row">
          <button className="btn primary" onClick={() => downloadFile(`enklaw-backup-${new Date().toISOString().slice(0, 10)}.json`, exportData(), "application/json")}>
            Export backup
          </button>
          {(["merge", "replace"] as const).map((mode) => (
            <label key={mode} className="btn">
              Import ({mode})
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (mode === "replace" && !confirm("Replace ALL current data with this backup?")) return;
                  try {
                    importData(await f.text(), mode);
                    setMsg(`Imported ${f.name}.`);
                  } catch (err) {
                    setMsg(err instanceof Error ? err.message : String(err));
                  }
                  e.target.value = "";
                }}
              />
            </label>
          ))}
        </div>
        {msg && <p className="small">{msg}</p>}
      </Section>
      <Section title="About">
        <p className="small">
          EnkLaw is a personal tool for self-represented litigants. It provides legal information and drafting help, not legal advice, and is not a
          substitute for a licensed attorney. AI output can be wrong — verify every citation, rule and deadline.
        </p>
      </Section>
    </div>
  );
}
