import { useEffect, useState } from "react";

export type ThemeId = "system" | "ivory" | "midnight" | "chambers";

export const THEMES: { id: ThemeId; name: string; note: string; side: string; bg: string; accent: string; gold: string }[] = [
  { id: "ivory", name: "Ivory & Ink", note: "Warm paper, navy ink, gold", side: "#13203a", bg: "#f5f1e8", accent: "#1d3461", gold: "#b7862b" },
  { id: "midnight", name: "Midnight", note: "Dark, easy on the eyes", side: "#080c14", bg: "#0c111b", accent: "#8fb3ff", gold: "#e6b85c" },
  { id: "chambers", name: "Chambers", note: "Bottle green & brass", side: "#12291f", bg: "#eef0ea", accent: "#1f4d3a", gold: "#a57a2a" },
  { id: "system", name: "Automatic", note: "Follows your device", side: "#13203a", bg: "#0c111b", accent: "#1d3461", gold: "#b7862b" },
];

const KEY = "enklaw:theme";

function resolve(t: ThemeId): Exclude<ThemeId, "system"> {
  if (t !== "system") return t;
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches ? "midnight" : "ivory";
}

function read(): ThemeId {
  try {
    const v = localStorage.getItem(KEY) as ThemeId | null;
    if (v && THEMES.some((t) => t.id === v)) return v;
  } catch {
    // storage unavailable
  }
  return "ivory";
}

export function applyTheme(t: ThemeId = read()) {
  document.documentElement.dataset.theme = resolve(t);
}

export function useTheme(): [ThemeId, (t: ThemeId) => void] {
  const [theme, setTheme] = useState<ThemeId>(read);
  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => applyTheme("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [theme]);
  return [
    theme,
    (t) => {
      try {
        localStorage.setItem(KEY, t);
      } catch {
        // storage unavailable
      }
      setTheme(t);
    },
  ];
}
