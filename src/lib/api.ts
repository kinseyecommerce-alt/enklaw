import type { ChatMessage } from "./types";
import { apiHeaders, apiUrl, getServer } from "./server";
import { isNative } from "./native";

export interface Health {
  ok: boolean;
  authOk?: boolean;
  aiConfigured: boolean;
  model: string;
  indianKanoon: boolean;
}

/** fetch() against the configured EnkLaw server, with its access code attached. */
function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (isNative() && !getServer().url) return Promise.reject(new Error("Set the EnkLaw server address in Settings to use this feature."));
  return fetch(apiUrl(path), { ...init, headers: apiHeaders((init.headers as Record<string, string>) ?? {}) });
}

export async function getHealth(): Promise<Health | null> {
  try {
    const r = await apiFetch("/api/health");
    return r.ok ? ((await r.json()) as Health) : null;
  } catch {
    return null;
  }
}

/** POSTs JSON and streams the plain-text response, calling onText with the accumulated text. */
export async function streamPost(path: string, body: unknown, onText: (full: string) => void, signal?: AbortSignal): Promise<string> {
  const res = await apiFetch(path, {
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

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export const chat = (
  caseContext: string,
  messages: ChatMessage[],
  opts: { webSearch: boolean; research: boolean },
  onText: (t: string) => void,
  signal?: AbortSignal,
) => streamPost("/api/chat", { caseContext, messages, ...opts }, onText, signal);

/** A file (PDF, image or text) prepared for upload to the AI endpoints. */
export interface Upload {
  title: string;
  text?: string;
  base64?: string;
  mediaType?: string;
}

const readAsBase64 = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });

export async function toUpload(file: File): Promise<Upload> {
  if (file.type === "application/pdf" || file.type.startsWith("image/"))
    return { title: file.name, base64: await readAsBase64(file), mediaType: file.type };
  return { title: file.name, text: await file.text() };
}

export interface OrderExtract {
  order_date: string;
  title: string;
  summary: string;
  outcome: string;
  judge: string;
  next_date: string;
  next_date_note: string;
  next_purpose: string;
  disposed: boolean;
  compliances: { task: string; due_date: string }[];
}

export const readOrder = (caseContext: string, upload: Upload) =>
  apiFetch("/api/read-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseContext, ...upload }) }).then(
    (r) => json<OrderExtract>(r),
  );

export interface Judgment {
  id: number;
  title: string;
  court: string;
  date?: string;
  citedBy: number;
  headline?: string;
  url: string;
}

export const ik = {
  courts: () => apiFetch("/api/ik/courts").then((r) => json<Record<string, string>>(r)),
  search: (p: { q: string; court?: string; from?: string; to?: string; sort?: string; page?: number }) => {
    const qs = new URLSearchParams(Object.entries(p).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
    return apiFetch(`/api/ik/search?${qs}`).then((r) => json<{ found: string; page: number; results: Judgment[] }>(r));
  },
};
