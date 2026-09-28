// Client for the Indian Kanoon API (https://api.indiankanoon.org). Token stays on the server.
// Pricing is per request (search ₹0.50, fragment ₹0.05), so responses are cached.

const API = "https://api.indiankanoon.org";
const SITE = "https://indiankanoon.org";
const CACHE_TTL_MS = 30 * 60 * 1000;

export class IKError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const ikToken = () => process.env.INDIANKANOON_API_TOKEN?.trim() || "";
export const ikConfigured = () => Boolean(ikToken());

const cache = new Map<string, { at: number; data: unknown }>();

async function post<T>(path: string): Promise<T> {
  const url = `${API}${path}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data as T;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Token ${ikToken()}`, Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = (data as { detail?: string })?.detail ?? (typeof data === "string" ? data.slice(0, 200) : res.statusText);
    const hint =
      res.status === 401 || res.status === 403
        ? " Check INDIANKANOON_API_TOKEN in your .env file (and that your account has credit)."
        : res.status === 429
          ? " Too many requests; try again shortly."
          : "";
    throw new IKError(res.status, `Indian Kanoon ${res.status}: ${String(detail).replace(/\.$/, "")}.${hint}`);
  }
  if ((data as { errmsg?: string })?.errmsg) throw new IKError(400, `Indian Kanoon: ${(data as { errmsg: string }).errmsg}`);
  cache.set(url, { at: Date.now(), data });
  return data as T;
}

const clean = (s?: string) =>
  s
    ?.replace(/<\/?b>/g, "**")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

/** Indian Kanoon court filters (the `doctypes:` operator). */
export const DOCTYPES: Record<string, string> = {
  judgments: "All courts",
  supremecourt: "Supreme Court",
  highcourts: "All High Courts",
  allahabad: "Allahabad HC",
  andhra: "Andhra Pradesh HC",
  bombay: "Bombay HC",
  chattisgarh: "Chhattisgarh HC",
  delhi: "Delhi HC",
  gauhati: "Gauhati HC",
  gujarat: "Gujarat HC",
  himachal_pradesh: "Himachal Pradesh HC",
  jammu: "Jammu & Kashmir HC",
  jharkhand: "Jharkhand HC",
  karnataka: "Karnataka HC",
  kerala: "Kerala HC",
  kolkata: "Calcutta HC",
  lucknow: "Allahabad HC (Lucknow)",
  madhyapradesh: "Madhya Pradesh HC",
  chennai: "Madras HC",
  meghalaya: "Meghalaya HC",
  orissa: "Orissa HC",
  patna: "Patna HC",
  punjab: "Punjab & Haryana HC",
  rajasthan: "Rajasthan HC",
  jodhpur: "Rajasthan HC (Jodhpur)",
  sikkim: "Sikkim HC",
  uttaranchal: "Uttarakhand HC",
  delhidc: "Delhi District Courts",
  tribunals: "All tribunals",
  consumer: "Consumer commissions",
  cat: "CAT",
  drat: "DRAT",
  itat: "ITAT",
  greentribunal: "NGT",
  cci: "CCI",
  laws: "Central Acts & laws",
};

export interface SearchParams {
  q: string;
  doctype?: string;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;
  sortBy?: "mostrecent" | "leastrecent";
  page?: number;
}

export interface Judgment {
  id: number;
  title: string;
  court: string;
  date?: string;
  citedBy: number;
  headline?: string;
  url: string;
}

const ikDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}-${m}-${y}`;
};

export async function search(p: SearchParams): Promise<{ found: string; results: Judgment[]; page: number }> {
  let q = p.q.trim();
  if (p.doctype && p.doctype !== "judgments" && DOCTYPES[p.doctype]) q += ` doctypes: ${p.doctype}`;
  if (p.fromDate) q += ` fromdate: ${ikDate(p.fromDate)}`;
  if (p.toDate) q += ` todate: ${ikDate(p.toDate)}`;
  if (p.sortBy) q += ` sortby: ${p.sortBy}`;
  const page = p.page ?? 0;
  const raw = await post<{ found?: string | number; docs?: Record<string, unknown>[] }>(
    `/search/?formInput=${encodeURIComponent(q)}&pagenum=${page}`,
  );
  return {
    found: String(raw.found ?? raw.docs?.length ?? 0),
    page,
    results: (raw.docs ?? []).map((d) => ({
      id: Number(d.tid),
      title: clean(String(d.title ?? "")) ?? "(untitled)",
      court: String(d.docsource ?? ""),
      date: typeof d.publishdate === "string" ? d.publishdate : undefined,
      citedBy: Number(d.numcitedby ?? d.numcites ?? 0),
      headline: clean(typeof d.headline === "string" ? d.headline : undefined)?.slice(0, 700),
      url: `${SITE}/doc/${d.tid}/`,
    })),
  };
}

/** Paragraphs of a judgment matching a query — the cheapest way (₹0.05) to read what a judgment says on a point. */
export async function fragment(id: number, q: string): Promise<{ title: string; url: string; fragments: string[] }> {
  const raw = await post<{ title?: string; headline?: string[] | string }>(`/docfragment/${id}/?formInput=${encodeURIComponent(q)}`);
  const parts = Array.isArray(raw.headline) ? raw.headline : raw.headline ? [raw.headline] : [];
  return { title: clean(raw.title) ?? "", url: `${SITE}/doc/${id}/`, fragments: parts.map((p) => clean(p) ?? "").filter(Boolean).slice(0, 12) };
}
