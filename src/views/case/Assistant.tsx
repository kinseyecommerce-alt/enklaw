import { useEffect, useRef, useState } from "react";
import type { Case, ChatMessage } from "../../lib/types";
import { updateCase } from "../../lib/store";
import { chat } from "../../lib/api";
import { caseContext } from "../../lib/context";
import { Markdown } from "../../components/Markdown";
import { AiGate } from "../../components/Gates";

const STARTERS = [
  "What should I do before the next date of hearing?",
  "Summarise the case and hearing history for my client.",
  "Is anything pending from the last order? Any limitation issue?",
  "Find Supreme Court judgments that support our case.",
  "इस केस की स्थिति हिंदी में समझाइए।",
];

export function Assistant({ c, aiReady, ikReady }: { c: Case; aiReady: boolean; ikReady: boolean }) {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [webSearch, setWebSearch] = useState(false);
  const [research, setResearch] = useState(ikReady);
  useEffect(() => setResearch(ikReady), [ikReady]);
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
      await chat(caseContext(c), history, { webSearch, research: research && ikReady }, onText, abort.current.signal);
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
            <p className="muted">Ask anything about your case. The assistant sees the case details, hearing history, orders, compliances, annexures and notes. Ask in English or Hindi.</p>
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
          placeholder="Ask about procedure, limitation, the last order, what to argue on the next date…"
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
            <label className="check" title={ikReady ? "" : "Add INDIANKANOON_API_TOKEN to .env to enable"}>
              <input type="checkbox" disabled={!ikReady} checked={research && ikReady} onChange={(e) => setResearch(e.target.checked)} /> Research judgments
              (Indian Kanoon)
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
