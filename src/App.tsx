import { useEffect, useState } from "react";
import { useCases, newCase } from "./lib/store";
import { getHealth, type Health } from "./lib/api";
import { Dashboard } from "./views/Dashboard";
import { Overview } from "./views/Overview";
import { Deadlines } from "./views/Deadlines";
import { EvidenceView } from "./views/Evidence";
import { Timeline } from "./views/Timeline";
import { Assistant } from "./views/Assistant";
import { Drafts } from "./views/Drafts";
import { Tools } from "./views/Tools";
import { Notes } from "./views/Notes";
import { Settings } from "./views/Settings";
import { Calculator } from "./views/Calculator";
import { CourtRecords } from "./views/CourtRecords";
import { Research } from "./views/Research";

const TABS = [
  ["overview", "Overview"],
  ["deadlines", "Deadlines & Hearings"],
  ["court", "Court Records"],
  ["evidence", "Evidence"],
  ["timeline", "Timeline"],
  ["assistant", "AI Assistant"],
  ["drafts", "Documents"],
  ["tools", "Analyze & Prep"],
  ["notes", "Notes"],
] as const;
type Tab = (typeof TABS)[number][0];

type Route = { page: "home" } | { page: "calculator" } | { page: "research" } | { page: "settings" } | { page: "case"; id: string; tab: Tab };

export function App() {
  const cases = useCases();
  const [route, setRoute] = useState<Route>({ page: "home" });
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    getHealth().then(setHealth);
  }, []);

  const current = route.page === "case" ? cases.find((c) => c.id === route.id) : undefined;
  useEffect(() => {
    if (route.page === "case" && !current) setRoute({ page: "home" });
  }, [route, current]);

  const openCase = (id: string, tab: Tab = "overview") => setRoute({ page: "case", id, tab });

  return (
    <div className="app">
      <aside className="sidebar">
        <button className="brand" onClick={() => setRoute({ page: "home" })}>
          <span className="logo">⚖</span> EnkLaw
        </button>
        <nav>
          <button className={route.page === "home" ? "nav active" : "nav"} onClick={() => setRoute({ page: "home" })}>
            Dashboard
          </button>
          <button className={route.page === "calculator" ? "nav active" : "nav"} onClick={() => setRoute({ page: "calculator" })}>
            Deadline calculator
          </button>
          <button className={route.page === "research" ? "nav active" : "nav"} onClick={() => setRoute({ page: "research" })}>
            Case law research
          </button>
          <div className="nav-heading">
            Cases
            <button
              className="icon-btn"
              title="New case"
              onClick={() => {
                const c = newCase();
                openCase(c.id);
              }}
            >
              +
            </button>
          </div>
          {cases.map((c) => (
            <button
              key={c.id}
              className={route.page === "case" && route.id === c.id ? "nav case active" : "nav case"}
              onClick={() => openCase(c.id)}
            >
              <span className="truncate">{c.title}</span>
              {c.caseNumber && <small className="muted">{c.caseNumber}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className={route.page === "settings" ? "nav active" : "nav"} onClick={() => setRoute({ page: "settings" })}>
            Settings & backup
          </button>
          <div className="ai-status" title={health?.model}>
            <span className={`dot ${health?.aiConfigured ? "on" : "off"}`} />
            {health == null ? "Server offline" : health.aiConfigured ? "AI ready" : "AI key missing"}
          </div>
          {health && (
            <div className="ai-status">
              <span className={`dot ${health.courtListener ? "on" : "off"}`} />
              {health.courtListener ? "Court records ready" : "CourtListener token missing"}
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        {route.page === "home" && <Dashboard cases={cases} openCase={openCase} />}
        {route.page === "calculator" && <Calculator />}
        {route.page === "research" && <Research cases={cases} clReady={!!health?.courtListener} />}
        {route.page === "settings" && <Settings health={health} />}
        {route.page === "case" && current && (
          <>
            <header className="case-head">
              <div>
                <h1>{current.title}</h1>
                <div className="muted">
                  {[current.caseNumber, current.court, current.jurisdiction].filter(Boolean).join(" · ") || "Add case details in Overview"}
                </div>
              </div>
            </header>
            <div className="tabs">
              {TABS.map(([key, label]) => (
                <button key={key} className={route.tab === key ? "tab active" : "tab"} onClick={() => openCase(current.id, key)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="tab-body">
              {route.tab === "overview" && <Overview c={current} />}
              {route.tab === "deadlines" && <Deadlines c={current} />}
              {route.tab === "court" && <CourtRecords c={current} clReady={!!health?.courtListener} />}
              {route.tab === "evidence" && <EvidenceView c={current} />}
              {route.tab === "timeline" && <Timeline c={current} />}
              {route.tab === "assistant" && <Assistant c={current} aiReady={!!health?.aiConfigured} clReady={!!health?.courtListener} />}
              {route.tab === "drafts" && <Drafts c={current} aiReady={!!health?.aiConfigured} clReady={!!health?.courtListener} />}
              {route.tab === "tools" && <Tools c={current} aiReady={!!health?.aiConfigured} />}
              {route.tab === "notes" && <Notes c={current} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
