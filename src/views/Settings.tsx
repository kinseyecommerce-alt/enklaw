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
      <Section title="AI assistant (Claude)">
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
            No API key. Copy <code>.env.example</code> to <code>.env</code>, set <code>ANTHROPIC_API_KEY</code>, and restart the server.
          </p>
        )}
      </Section>
      <Section title="Judgments (Indian Kanoon)">
        {health?.indianKanoon ? (
          <p>Connected. Judgment search, citation verification and AI research are enabled.</p>
        ) : (
          <p>
            Not configured. Create an account at{" "}
            <a href="https://api.indiankanoon.org/" target="_blank" rel="noreferrer">
              api.indiankanoon.org
            </a>
            , copy your API token, set <code>INDIANKANOON_API_TOKEN</code> in <code>.env</code>, and restart. New accounts get ₹500 credit;
            non-commercial users can apply for ₹10,000 of free credit a month.
          </p>
        )}
      </Section>
      <Section title="Case status from courts">
        <p className="small">
          The Supreme Court, High Courts, eCourts, tribunals and consumer commissions do not offer a public API, and their sites use CAPTCHAs. EnkLaw
          therefore links to each court's official status page from the case, and reads orders you download (PDF or photo) to update the diary.
        </p>
      </Section>
      <Section title="Backup your data">
        <p className="muted">Your diary is stored only in this browser. Export a backup regularly — clearing browser data erases it.</p>
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
          EnkLaw is a personal case diary and legal assistant for Indian courts. AI output can be wrong — verify every section, citation, date and
          limitation period.
        </p>
      </Section>
    </div>
  );
}
