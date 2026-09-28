// Thin, cached client for the CourtListener REST API v4 (https://www.courtlistener.com).
// The API token stays on the server; the browser talks to /api/cl/* only.

const BASE = "https://www.courtlistener.com";
const API = `${BASE}/api/rest/v4`;
const CACHE_TTL_MS = 10 * 60 * 1000;

export class CourtListenerError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const clToken = () => process.env.COURTLISTENER_API_TOKEN?.trim() || "";
export const clConfigured = () => Boolean(clToken());

const cache = new Map<string, { at: number; data: unknown }>();

async function request<T>(pathOrUrl: string, init: RequestInit = {}, useCache = true): Promise<T> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${API}${pathOrUrl}`;
  if (!url.startsWith(`${API}/`)) throw new CourtListenerError(400, "Refusing to call a non-CourtListener URL");
  const method = init.method ?? "GET";
  const key = `${method} ${url} ${typeof init.body === "string" ? init.body : ""}`;
  const hit = cache.get(key);
  if (useCache && hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data as T;

  const headers: Record<string, string> = { Accept: "application/json", ...(init.headers as Record<string, string>) };
  if (clToken()) headers.Authorization = `Token ${clToken()}`;
  const res = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(30_000) });

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = (data as { detail?: string } | undefined)?.detail ?? (typeof data === "string" ? data.slice(0, 300) : res.statusText);
    const hint =
      res.status === 401 || res.status === 403
        ? " Check COURTLISTENER_API_TOKEN in your .env file."
        : res.status === 429
          ? " CourtListener's rate limit was reached; try again later."
          : "";
    throw new CourtListenerError(res.status, `CourtListener ${res.status}: ${String(detail).replace(/\.$/, "")}.${hint}`);
  }
  if (useCache && method === "GET") cache.set(key, { at: Date.now(), data });
  return data as T;
}

const abs = (u?: string | null) => (u ? (u.startsWith("http") ? u : `${BASE}${u}`) : undefined);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const plain = (s?: string) => s?.replace(/<[^>]+>/g, "").trim() || undefined;
const stripHtml = (s?: string) => s?.replace(/<\/?mark>/g, "**").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// ---------- Search ----------

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

export interface SearchPage<T> {
  count: number;
  next?: string;
  results: T[];
}

type RawSearch = { count: number; next: string | null; results: Record<string, unknown>[] };

export interface SearchParams {
  q: string;
  court?: string;
  filedAfter?: string;
  filedBefore?: string;
  cursor?: string;
  orderBy?: string;
}

function searchQuery(type: string, p: SearchParams): string {
  // `cursor` is the full `next` URL returned by a previous page.
  if (p.cursor) return p.cursor;
  const qs = new URLSearchParams({ type, q: p.q, highlight: "on" });
  if (p.court) qs.set("court", p.court.trim().replace(/[,\s]+/g, " "));
  if (p.filedAfter) qs.set("filed_after", p.filedAfter);
  if (p.filedBefore) qs.set("filed_before", p.filedBefore);
  if (p.orderBy) qs.set("order_by", p.orderBy);
  return `/search/?${qs}`;
}

export async function searchOpinions(p: SearchParams): Promise<SearchPage<OpinionResult>> {
  const raw = await request<RawSearch>(searchQuery("o", p));
  return {
    count: raw.count,
    next: raw.next ?? undefined,
    results: raw.results.map((r) => {
      const opinions = (r.opinions as { snippet?: string }[] | undefined) ?? [];
      return {
        clusterId: Number(r.cluster_id),
        caseName: plain(str(r.caseName)) ?? "(untitled)",
        court: str(r.court) ?? "",
        courtId: str(r.court_id) ?? "",
        dateFiled: str(r.dateFiled),
        docketNumber: str(r.docketNumber),
        citations: (r.citation as string[] | undefined) ?? [],
        citeCount: Number(r.citeCount ?? 0),
        status: str(r.status),
        judge: str(r.judge),
        snippet: stripHtml(opinions.find((o) => o.snippet?.trim())?.snippet)?.slice(0, 600),
        url: abs(r.absolute_url as string) ?? BASE,
      };
    }),
  };
}

function toDocketResult(r: Record<string, unknown>): DocketResult {
  return {
    docketId: Number(r.docket_id ?? r.id),
    caseName: plain(str(r.caseName) ?? str(r.case_name)) ?? "(untitled)",
    court: str(r.court) ?? "",
    courtId: str(r.court_id) ?? "",
    docketNumber: plain(str(r.docketNumber) ?? str(r.docket_number)),
    dateFiled: str(r.dateFiled) ?? str(r.date_filed),
    dateTerminated: str(r.dateTerminated) ?? str(r.date_terminated),
    judge: str(r.assignedTo) ?? str(r.assigned_to_str),
    cause: str(r.cause),
    natureOfSuit: str(r.suitNature) ?? str(r.nature_of_suit),
    parties: ((r.party as string[] | undefined) ?? []).slice(0, 12),
    url: abs((r.docket_absolute_url ?? r.absolute_url) as string) ?? BASE,
  };
}

export async function searchDockets(p: SearchParams): Promise<SearchPage<DocketResult>> {
  const raw = await request<RawSearch>(searchQuery("d", p));
  return { count: raw.count, next: raw.next ?? undefined, results: raw.results.map(toDocketResult) };
}

// ---------- Dockets ----------

export interface DocketEntry {
  entryNumber?: number;
  dateFiled?: string;
  description: string;
  documents: { description?: string; documentNumber?: string; pageCount?: number; available: boolean; url?: string; pdfUrl?: string }[];
}

export interface DocketDetail extends DocketResult {
  juryDemand?: string;
  entries: DocketEntry[];
  entriesNote?: string;
  partyDetails: { name: string; types: string[]; attorneys: string[] }[];
}

type Paged<T> = { count?: number; next: string | null; results: T[] };

export async function getDocket(id: number): Promise<DocketDetail> {
  const d = await request<Record<string, unknown>>(`/dockets/${id}/`, {}, false);
  const court = d.court_id ? await courtName(String(d.court_id)) : "";
  const base = toDocketResult({ ...d, court, docket_id: d.id });
  const [entries, parties] = await Promise.all([getEntries(id), getParties(id)]);
  return {
    ...base,
    juryDemand: str(d.jury_demand),
    entries: entries.entries,
    entriesNote: entries.note,
    partyDetails: parties,
    parties: parties.length ? parties.map((p) => p.name) : base.parties,
  };
}

async function getEntries(docket: number): Promise<{ entries: DocketEntry[]; note?: string }> {
  try {
    const raw = await request<Paged<Record<string, unknown>>>(`/docket-entries/?docket=${docket}&order_by=-entry_number`, {}, false);
    return {
      entries: raw.results.map((e) => ({
        entryNumber: e.entry_number == null ? undefined : Number(e.entry_number),
        dateFiled: str(e.date_filed),
        description: stripHtml(str(e.description)) ?? "",
        documents: ((e.recap_documents as Record<string, unknown>[] | undefined) ?? []).map((doc) => ({
          description: str(doc.description),
          documentNumber: str(String(doc.document_number ?? "")),
          pageCount: doc.page_count == null ? undefined : Number(doc.page_count),
          available: Boolean(doc.is_available),
          url: abs(doc.absolute_url as string),
          pdfUrl: doc.filepath_local ? `https://storage.courtlistener.com/${doc.filepath_local}` : undefined,
        })),
      })),
      note: raw.next ? "Showing the most recent entries. Open the docket on CourtListener for the full history." : undefined,
    };
  } catch (e) {
    if (!(e instanceof CourtListenerError) || e.status !== 403) throw e;
    // The docket-entries endpoint needs extra permissions on some accounts; fall back to the search index.
    const raw = await request<RawSearch>(`/search/?type=r&q=${encodeURIComponent(`docket_id:${docket}`)}`);
    const docs = (raw.results[0]?.recap_documents as Record<string, unknown>[] | undefined) ?? [];
    const byEntry = new Map<number, DocketEntry>();
    for (const doc of docs) {
      const n = Number(doc.entry_number);
      const entry = byEntry.get(n) ?? { entryNumber: n, dateFiled: str(doc.entry_date_filed), description: stripHtml(str(doc.description)) ?? "", documents: [] };
      entry.documents.push({
        description: str(doc.short_description) ?? str(doc.description),
        documentNumber: str(String(doc.document_number ?? "")),
        pageCount: doc.page_count == null ? undefined : Number(doc.page_count),
        available: Boolean(doc.is_available),
        url: abs(doc.absolute_url as string),
        pdfUrl: doc.filepath_local ? `https://storage.courtlistener.com/${doc.filepath_local}` : undefined,
      });
      byEntry.set(n, entry);
    }
    return {
      entries: [...byEntry.values()].sort((a, b) => (b.entryNumber ?? 0) - (a.entryNumber ?? 0)),
      note: "Your CourtListener account can't read the full docket-entry API, so only entries with documents in the RECAP archive are shown.",
    };
  }
}

async function getParties(docket: number): Promise<DocketDetail["partyDetails"]> {
  try {
    const raw = await request<Paged<Record<string, unknown>>>(`/parties/?docket=${docket}`, {}, false);
    return raw.results.map((p) => ({
      name: str(p.name) ?? "",
      types: ((p.party_types as { name?: string }[] | undefined) ?? []).map((t) => t.name ?? "").filter(Boolean),
      attorneys: ((p.attorneys as { name?: string }[] | undefined) ?? []).map((a) => a.name ?? "").filter(Boolean),
    }));
  } catch (e) {
    if (e instanceof CourtListenerError && e.status === 403) return [];
    throw e;
  }
}

const courtNames = new Map<string, string>();
async function courtName(id: string): Promise<string> {
  if (courtNames.has(id)) return courtNames.get(id)!;
  try {
    const c = await request<{ full_name?: string; short_name?: string }>(`/courts/${encodeURIComponent(id)}/`);
    const name = c.full_name ?? c.short_name ?? id;
    courtNames.set(id, name);
    return name;
  } catch {
    return id;
  }
}

// ---------- Citation verification ----------

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

export async function checkCitations(text: string): Promise<CitationCheck[]> {
  if (text.length > 64_000) throw new CourtListenerError(400, "Text is longer than CourtListener's 64,000 character limit for citation checks.");
  const raw = await request<Record<string, unknown>[]>(
    "/citation-lookup/",
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ text }).toString() },
    false,
  );
  const verdicts: Record<number, CitationCheck["verdict"]> = { 200: "verified", 404: "not_found", 400: "invalid", 300: "ambiguous", 429: "throttled" };
  return raw.map((c) => {
    const status = Number(c.status);
    return {
      citation: String(c.citation ?? ""),
      normalized: (c.normalized_citations as string[] | undefined) ?? [],
      start: Number(c.start_index ?? 0),
      end: Number(c.end_index ?? 0),
      status,
      verdict: verdicts[status] ?? "error",
      message: str(c.error_message),
      matches: ((c.clusters as Record<string, unknown>[] | undefined) ?? []).map((cl) => ({
        caseName: str(cl.case_name) ?? str(cl.case_name_full) ?? "(untitled)",
        dateFiled: str(cl.date_filed),
        url: abs(cl.absolute_url as string) ?? BASE,
      })),
    };
  });
}

// ---------- Docket alerts ----------

export async function createDocketAlert(docket: number): Promise<{ id: number }> {
  const r = await request<{ id: number }>(
    "/docket-alerts/",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ docket, alert_type: 1 }) },
    false,
  );
  return { id: r.id };
}

export async function deleteDocketAlert(id: number): Promise<void> {
  await request(`/docket-alerts/${id}/`, { method: "DELETE" }, false);
}
