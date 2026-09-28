import type { ChatMessage } from "./types";

export interface Health {
  ok: boolean;
  aiConfigured: boolean;
  model: string;
}

export async function getHealth(): Promise<Health | null> {
  try {
    const r = await fetch("/api/health");
    return r.ok ? ((await r.json()) as Health) : null;
  } catch {
    return null;
  }
}

/** POSTs JSON and streams the plain-text response, calling onText with the accumulated text. */
export async function streamPost(
  path: string,
  body: unknown,
  onText: (full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Request failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onText(full);
  }
  return full;
}

export const chat = (caseContext: string, messages: ChatMessage[], webSearch: boolean, onText: (t: string) => void, signal?: AbortSignal) =>
  streamPost("/api/chat", { caseContext, messages, webSearch }, onText, signal);
