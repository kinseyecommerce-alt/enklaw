import type { ChatMessage, DocketEntry } from "./types";

export interface Health {
  ok: boolean;
  aiConfigured: boolean;
  model: string;
  courtListener: boolean;
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

export const chat = (
  caseContext: string,
  messages: ChatMessage[],
  opts: { webSearch: boolean; caseLaw: boolean },
  onText: (t: string) => void,
  signal?: AbortSignal,
) => streamPost("/api/chat", { caseContext, messages, ...opts }, onText, signal);

// ---------- CourtListener ----------

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export interface SearchPage<T> {
  count: number;
  next?: string;
  results: T[];
}

export interface OpinionResult {
  clusterId: number;
  caseName: string;
  court: string;
  courtId: string;
  dateFiled?: string;
  docketNumber?: string;
  citations: string[];
  citeCount: number;
  status?: string;
  judge?: string;
  snippet?: string;
  url: string;
}

export interface DocketResult {
  docketId: number;
  caseName: string;
  court: string;
  courtId: string;
  docketNumber?: string;
  dateFiled?: string;
  dateTerminated?: string;
  judge?: string;
  cause?: string;
  natureOfSuit?: string;
  parties: string[];
  url: string;
}

export interface DocketDetail extends DocketResult {
  juryDemand?: string;
  entries: DocketEntry[];
  entriesNote?: string;
  partyDetails: { name: string; types: string[]; attorneys: string[] }[];
}

export interface CitationCheck {
  citation: string;
  normalized: string[];
  start: number;
  end: number;
  status: number;
  verdict: "verified" | "not_found" | "invalid" | "ambiguous" | "throttled" | "error";
  message?: string;
  matches: { caseName: string; dateFiled?: string; url: string }[];
}

export interface SearchFilters {
  q: string;
  court?: string;
  filed_after?: string;
  filed_before?: string;
  order_by?: string;
  cursor?: string;
}

const qs = (f: SearchFilters) =>
  new URLSearchParams(Object.entries(f).filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== "")).toString();

export const cl = {
  opinions: (f: SearchFilters) => fetch(`/api/cl/opinions?${qs(f)}`).then((r) => json<SearchPage<OpinionResult>>(r)),
  dockets: (f: SearchFilters) => fetch(`/api/cl/dockets?${qs(f)}`).then((r) => json<SearchPage<DocketResult>>(r)),
  docket: (id: number) => fetch(`/api/cl/dockets/${id}`).then((r) => json<DocketDetail>(r)),
  citations: (text: string) =>
    fetch("/api/cl/citations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }).then((r) =>
      json<CitationCheck[]>(r),
    ),
  watch: (docket: number) =>
    fetch("/api/cl/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ docket }) }).then((r) =>
      json<{ id: number }>(r),
    ),
  unwatch: (id: number) => fetch(`/api/cl/alerts/${id}`, { method: "DELETE" }).then((r) => json<unknown>(r)),
};
