// Native (Android / iOS) integrations. Every function falls back to the web behaviour
// when the app runs in a browser, so callers never need to branch.
import { Capacitor } from "@capacitor/core";
import type { Case } from "./types";
import { caseNo } from "./courts";
import { fromISO } from "./dates";

export const isNative = () => Capacitor.isNativePlatform();

const toBase64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

/** Saves a file. On phones it is written to the cache and handed to the share sheet (WhatsApp, Drive, Files…). */
export async function saveFile(name: string, content: string, type: string): Promise<void> {
  if (!isNative()) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");
  const res = await Filesystem.writeFile({ path: name, data: toBase64(content), directory: Directory.Cache });
  await Share.share({ title: name, url: res.uri, dialogTitle: `Share ${name}` });
}

/** Shares text (e.g. the day's cause list). Returns "shared" or "copied". */
export async function shareText(title: string, text: string): Promise<"shared" | "copied"> {
  if (isNative()) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title, text, dialogTitle: title });
    return "shared";
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}

// ---------- Hearing reminders ----------

const REMINDER_KEY = "enklaw:reminders";

export interface ReminderSettings {
  enabled: boolean;
  eveningBefore: string; // "19:00"
  morningOf: string; // "07:30"
}

export function getReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(REMINDER_KEY);
    if (raw) return { enabled: false, eveningBefore: "19:00", morningOf: "07:30", ...(JSON.parse(raw) as Partial<ReminderSettings>) };
  } catch {
    // storage unavailable
  }
  return { enabled: false, eveningBefore: "19:00", morningOf: "07:30" };
}

export function setReminderSettings(s: ReminderSettings) {
  try {
    localStorage.setItem(REMINDER_KEY, JSON.stringify(s));
  } catch {
    // storage unavailable
  }
}

/** Stable positive 31-bit id per reminder so rescheduling replaces rather than duplicates. */
const notifId = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return Math.abs(h) % 2_000_000_000;
};

const at = (iso: string, hhmm: string, dayOffset = 0) => {
  const d = fromISO(iso);
  const [h, m] = hhmm.split(":").map(Number);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};

/** Asks for notification permission. Returns true if granted. */
export async function enableReminders(): Promise<boolean> {
  if (!isNative()) return false;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const p = await LocalNotifications.requestPermissions();
  return p.display === "granted";
}

/**
 * Replaces all scheduled hearing and compliance reminders with ones for the next 60 days:
 * the evening before and the morning of each listing, and the morning a compliance is due.
 */
export async function syncReminders(cases: Case[]): Promise<number> {
  if (!isNative()) return 0;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });

  const s = getReminderSettings();
  if (!s.enabled) return 0;
  const now = Date.now();
  const horizon = now + 60 * 86_400_000;
  const list: { id: number; title: string; body: string; schedule: { at: Date } }[] = [];

  const byDate = new Map<string, { c: Case; item?: string; purpose?: string; hall?: string }[]>();
  for (const c of cases) {
    if (c.status === "disposed") continue;
    for (const h of c.hearings) if (!h.outcome) byDate.set(h.date, [...(byDate.get(h.date) ?? []), { c, item: h.itemNo, purpose: h.purpose, hall: h.courtHall }]);
  }
  for (const [date, items] of byDate) {
    const lines = items.map((x) => `${caseNo(x.c) || x.c.title}${x.item ? ` · Item ${x.item}` : ""}${x.hall ? ` · Court ${x.hall}` : ""}`);
    const title = `${items.length} ${items.length === 1 ? "matter" : "matters"} listed`;
    const evening = at(date, s.eveningBefore, -1);
    const morning = at(date, s.morningOf);
    if (evening.getTime() > now && evening.getTime() < horizon)
      list.push({ id: notifId(`e${date}`), title: `Tomorrow: ${title}`, body: lines.join("\n"), schedule: { at: evening } });
    if (morning.getTime() > now && morning.getTime() < horizon)
      list.push({ id: notifId(`m${date}`), title: `Today: ${title}`, body: lines.join("\n"), schedule: { at: morning } });
  }
  for (const c of cases)
    for (const t of c.tasks) {
      if (t.done) continue;
      const when = at(t.due, s.morningOf);
      if (when.getTime() > now && when.getTime() < horizon)
        list.push({ id: notifId(`t${t.id}`), title: `Due today: ${t.title}`, body: caseNo(c) || c.title, schedule: { at: when } });
    }

  // Android and iOS cap pending notifications (iOS at 64); keep the soonest.
  list.sort((a, b) => a.schedule.at.getTime() - b.schedule.at.getTime());
  const batch = list.slice(0, 60);
  if (batch.length) await LocalNotifications.schedule({ notifications: batch });
  return batch.length;
}

export async function setupStatusBar(dark = true) {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    if (Capacitor.getPlatform() === "android") await StatusBar.setBackgroundColor({ color: "#13203a" });
  } catch {
    // status bar plugin unavailable
  }
}
