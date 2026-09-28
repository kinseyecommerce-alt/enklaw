import { useEffect, useState } from "react";
import { useCases, newCase } from "./lib/store";
import { getHealth, type Health } from "./lib/api";
import { caseNo, courtLabel } from "./lib/courts";
import { nextHearing } from "./lib/diary";
import { fmt } from "./lib/dates";
import { CauseList } from "./views/CauseList";
import { Cases } from "./views/Cases";
import { Limitation } from "./views/Limitation";
import { Judgments } from "./views/Judgments";
import { Settings } from "./views/Settings";
import { Overview } from "./views/case/Overview";
import { Hearings } from "./views/case/Hearings";
import { Orders } from "./views/case/Orders";
import { Tasks } from "./views/case/Tasks";
import { Annexures } from "./views/case/Annexures";
import { Timeline } from "./views/case/Timeline";
import { Assistant } from "./views/case/Assistant";
import { Drafts } from "./views/case/Drafts";
import { Tools } from "./views/case/Tools";
import { Notes } from "./views/case/Notes";

const TABS = [
  ["overview", "Details"],
  ["hearings", "Hearings"],
  ["orders", "Orders"],
  ["tasks", "Compliances"],
  ["annexures", "Annexures"],
  ["timeline", "List of Dates"],
  ["assistant", "AI Assistant"],
  ["drafts", "Drafting"],
  ["tools", "Analyse & Prep"],
  ["notes", "Notes"],
] as const;
type Tab = (typeof TABS)[number][0];

type Page = "causelist" | "cases" | "limitation" | "judgments" | "settings";
type Route = { page: Page } | { page: "case"; id: string; tab: Tab };

const NAV: [Page, string][] = [
  ["causelist", "Cause list"],
  ["cases", "Cases"],
  ["limitation", "Limitation calculator"],
  ["judgments", "Judgments"],
];

export function App() {
  const cases = useCases();
  const [route, setRoute] = useState<Route>({ page: "causelist" });
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    getHealth().then(setHealth);
  }, []);

  const current = route.page === "case" ? cases.find((c) => c.id === route.id) : undefined;
  useEffect(() => {
    if (route.page === "case" && !current) setRoute({ page: "cases" });
  }, [route, current]);

  const openCase = (id: string, tab: Tab = "overview") => setRoute({ page: "case", id, tab });
  const aiReady = !!health?.aiConfigured;
  const ikReady = !!health?.indianKanoon;
  const next = current && nextHearing(current);

  return (
    <div className="app">
      <aside className="sidebar">
        <button className="brand" onClick={() => setRoute({ page: "causelist" })}>
          <span className="logo">⚖</span> EnkLaw
        </button>
        <nav>
          {NAV.map(([page, label]) => (
            <button key={page} className={route.page === page ? "nav active" : "nav"} onClick={() => setRoute({ page })}>
              {label}
            </button>
          ))}
          <button
            className="btn primary new-case"
            onClick={() => {
              const c = newCase();
              openCase(c.id);
            }}
          >
            + New case
          </button>
        </nav>
        <div className="sidebar-foot">
          <button className={route.page === "settings" ? "nav active" : "nav"} onClick={() => setRoute({ page: "settings" })}>
            Settings & backup
          </button>
          <div className="ai-status" title={health?.model}>
            <span className={`dot ${aiReady ? "on" : "off"}`} />
            {health == null ? "Server offline" : aiReady ? "AI ready" : "AI key missing"}
          </div>
          {health && (
            <div className="ai-status">
              <span className={`dot ${ikReady ? "on" : "off"}`} />
              {ikReady ? "Indian Kanoon ready" : "Indian Kanoon token missing"}
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        {route.page === "causelist" && <CauseList cases={cases} openCase={openCase} />}
        {route.page === "cases" && <Cases cases={cases} openCase={openCase} />}
        {route.page === "limitation" && <Limitation />}
        {route.page === "judgments" && <Judgments cases={cases} ikReady={ikReady} />}
        {route.page === "settings" && <Settings health={health} />}
        {route.page === "case" && current && (
          <>
            <header className="case-head">
              <div>
                <button className="link" onClick={() => setRoute({ page: "cases" })}>
                  ← All cases
                </button>
                <h1>{current.title}</h1>
                <div className="muted">
                  {[caseNo(current), current.court || courtLabel(current.courtType), current.cnr && `CNR ${current.cnr}`].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="next-date">
                {current.status === "disposed" ? (
                  <span className="badge ok">Disposed{current.disposalDate ? ` ${fmt(current.disposalDate)}` : ""}</span>
                ) : next ? (
                  <>
                    <span className="muted small">Next date</span>
                    <strong>{fmt(next.date)}</strong>
                    <span className="small">{next.purpose}</span>
                  </>
                ) : (
                  <span className="badge warn">Next date awaited</span>
                )}
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
              {route.tab === "hearings" && <Hearings c={current} />}
              {route.tab === "orders" && <Orders c={current} aiReady={aiReady} />}
              {route.tab === "tasks" && <Tasks c={current} />}
              {route.tab === "annexures" && <Annexures c={current} />}
              {route.tab === "timeline" && <Timeline c={current} />}
              {route.tab === "assistant" && <Assistant c={current} aiReady={aiReady} ikReady={ikReady} />}
              {route.tab === "drafts" && <Drafts c={current} aiReady={aiReady} ikReady={ikReady} />}
              {route.tab === "tools" && <Tools c={current} aiReady={aiReady} />}
              {route.tab === "notes" && <Notes c={current} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
