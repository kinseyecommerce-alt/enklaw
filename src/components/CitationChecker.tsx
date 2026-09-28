import { useState } from "react";
import { cl, type CitationCheck } from "../lib/api";

const LABELS: Record<CitationCheck["verdict"], [string, string]> = {
  verified: ["ok", "Verified"],
  ambiguous: ["warn", "Ambiguous"],
  not_found: ["bad", "Not found"],
  invalid: ["bad", "Invalid reporter"],
  throttled: ["warn", "Rate limited"],
  error: ["bad", "Error"],
};

export function CitationChecker({ text, disabled }: { text: string; disabled?: boolean }) {
  const [results, setResults] = useState<CitationCheck[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const check = async () => {
    setBusy(true);
    setError("");
    try {
      setResults(await cl.citations(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  const problems = results?.filter((r) => r.verdict !== "verified").length ?? 0;

  return (
    <div className="stack tight">
      <div className="row">
        <button className="btn" disabled={disabled || busy || !text.trim()} onClick={check}>
          {busy ? "Checking…" : "Check citations"}
        </button>
        {results && (
          <span className={`badge ${results.length === 0 ? "muted" : problems ? "bad" : "ok"}`}>
            {results.length === 0 ? "No case citations found" : problems ? `${problems} of ${results.length} need attention` : `All ${results.length} verified`}
          </span>
        )}
        <button className="link" hidden={!results} onClick={() => setResults(null)}>
          Hide
        </button>
      </div>
      {error && <div className="notice">{error}</div>}
      {results && results.length > 0 && (
        <table className="table small">
          <thead>
            <tr>
              <th>Citation</th>
              <th>Result</th>
              <th>Matches</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const [cls, label] = LABELS[r.verdict];
              return (
                <tr key={i}>
                  <td className="nowrap">
                    {r.citation}
                    {r.normalized.length > 0 && r.normalized[0] !== r.citation && <div className="muted">→ {r.normalized.join(" / ")}</div>}
                  </td>
                  <td>
                    <span className={`badge ${cls}`}>{label}</span>
                    {r.verdict === "not_found" && <div className="muted">May be fabricated or outside CourtListener — verify manually.</div>}
                  </td>
                  <td>
                    {r.matches.map((m) => (
                      <div key={m.url}>
                        <a href={m.url} target="_blank" rel="noreferrer">
                          {m.caseName}
                        </a>{" "}
                        <span className="muted">{m.dateFiled?.slice(0, 4)}</span>
                      </div>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
