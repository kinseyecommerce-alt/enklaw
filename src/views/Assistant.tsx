import { useEffect, useRef, useState } from "react";
import type { Case, ChatMessage } from "../lib/types";
import { updateCase } from "../lib/store";
import { chat } from "../lib/api";
import { caseContext } from "../lib/context";
import { Markdown } from "../components/Markdown";
import { AiGate } from "../components/AiGate";

const STARTERS = [
  "What are my next steps and upcoming deadlines?",
  "Explain the procedure for my type of case in plain English.",
  "What are the weaknesses in my case and how can I address them?",
  "What evidence am I missing to prove my claims?",
  "How do I properly serve documents on the other party?",
];

export function Assistant({ c, aiReady, clReady }: { c: Case; aiReady: boolean; clReady: boolean }) {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [webSearch, setWebSearch] = useState(false);
  const [caseLaw, setCaseLaw] = useState(clReady);
  useEffect(() => setCaseLaw(clReady), [clReady]);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [c.chat.length, streaming]);
  useEffect(() => () => abort.current?.abort(), []);

  const send = async (text: string) => {
    if (!text.trim() || streaming !== null) return;
    const history: ChatMessage[] = [...c.chat, { role: "user", content: text.trim() }];
    updateCase(c.id, (x) => ({ ...x, chat: history }));
    setInput("");
    setStreaming("");
    abort.current = new AbortController();
    let reply = "";
    const onText = (t: string) => {
      reply = t;
      setStreaming(t);
    };
    try {
      await chat(caseContext(c), history, { webSearch, caseLaw: caseLaw && clReady }, onText, abort.current.signal);
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "AbortError";
      reply += aborted ? "\n\n_[stopped]_" : `\n\n[Error: ${e instanceof Error ? e.message : String(e)}]`;
    }
    updateCase(c.id, (x) => ({ ...x, chat: [...history, { role: "assistant", content: reply || "(no response)" }] }));
    setStreaming(null);
  };

  return (
    <div className="chat">
      {!aiReady && <AiGate />}
      <div className="chat-log">
        {c.chat.length === 0 && streaming === null && (
          <div className="starters">
            <p className="muted">Ask anything about your case. The assistant sees your case details, deadlines, evidence, timeline and notes.</p>
            {STARTERS.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)} disabled={!aiReady}>
                {s}
              </button>
            ))}
          </div>
        )}
        {c.chat.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === "assistant" ? <Markdown text={m.content} /> : <p>{m.content}</p>}
          </div>
        ))}
        {streaming !== null && (
          <div className="msg assistant">
            {streaming ? <Markdown text={streaming} /> : <span className="muted">Thinking…</span>}
          </div>
        )}
        <div ref={bottom} />
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          rows={3}
          value={input}
          placeholder="Ask about procedure, deadlines, evidence, what to say at a hearing…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <div className="row between">
          <div className="row" style={{ gap: 16 }}>
            <label className="check" title={clReady ? "" : "Add COURTLISTENER_API_TOKEN to .env to enable"}>
              <input type="checkbox" disabled={!clReady} checked={caseLaw && clReady} onChange={(e) => setCaseLaw(e.target.checked)} /> Research & verify case law
              (CourtListener)
            </label>
            <label className="check">
              <input type="checkbox" checked={webSearch} onChange={(e) => setWebSearch(e.target.checked)} /> Search the web
            </label>
          </div>
          <div className="row">
            {c.chat.length > 0 && streaming === null && (
              <button type="button" className="btn" onClick={() => confirm("Clear this conversation?") && updateCase(c.id, (x) => ({ ...x, chat: [] }))}>
                Clear chat
              </button>
            )}
            {streaming !== null ? (
              <button type="button" className="btn" onClick={() => abort.current?.abort()}>
                Stop
              </button>
            ) : (
              <button className="btn primary" disabled={!aiReady || !input.trim()}>
                Send
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
