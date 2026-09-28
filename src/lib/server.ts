// Where the EnkLaw API server lives. On the web the app and server share an origin, so the
// default is "" (relative URLs). The phone apps have no server of their own: they need the
// address of a server you host (or your computer on the same network) plus its access code.
const KEY = "enklaw:server";

export interface ServerSettings {
  url: string; // e.g. "https://enklaw.example.com" — empty means same origin
  token: string; // matches ENKLAW_ACCESS_TOKEN on the server, if set
}

export function getServer(): ServerSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { url: "", token: "", ...(JSON.parse(raw) as Partial<ServerSettings>) };
  } catch {
    // storage unavailable
  }
  return { url: "", token: "" };
}

export function setServer(s: ServerSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ url: s.url.trim().replace(/\/+$/, ""), token: s.token.trim() }));
  } catch {
    // storage unavailable
  }
}

export const apiUrl = (path: string) => `${getServer().url}${path}`;

export function apiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const { token } = getServer();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}
