import { useSyncExternalStore } from "react";
import type { Case } from "./types";
import { uid } from "./id";

const KEY = "enklaw:v1";

interface State {
  cases: Case[];
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    // storage unavailable or corrupt; start empty
  }
  return { cases: [] };
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Could not save to localStorage", e);
    alert("Could not save your data — browser storage may be full. Export a backup from Settings.");
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

export function useCases(): Case[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state.cases,
  );
}

export function newCase(partial: Partial<Case> = {}): Case {
  const c: Case = {
    id: uid(),
    title: "Untitled case",
    myRole: "Plaintiff",
    status: "active",
    createdAt: new Date().toISOString(),
    parties: [],
    deadlines: [],
    evidence: [],
    timeline: [],
    drafts: [],
    notes: [],
    chat: [],
    ...partial,
  };
  state = { cases: [c, ...state.cases] };
  emit();
  return c;
}

export function updateCase(id: string, fn: (c: Case) => Case) {
  state = { cases: state.cases.map((c) => (c.id === id ? fn(c) : c)) };
  emit();
}

export function deleteCase(id: string) {
  state = { cases: state.cases.filter((c) => c.id !== id) };
  emit();
}

export function exportData(): string {
  return JSON.stringify({ app: "enklaw", version: 1, exportedAt: new Date().toISOString(), ...state }, null, 2);
}

export function importData(json: string, mode: "merge" | "replace") {
  const parsed = JSON.parse(json) as Partial<State>;
  if (!Array.isArray(parsed.cases)) throw new Error("File does not look like an EnkLaw backup.");
  if (mode === "replace") {
    state = { cases: parsed.cases };
  } else {
    const existing = new Set(state.cases.map((c) => c.id));
    state = { cases: [...state.cases, ...parsed.cases.filter((c) => !existing.has(c.id))] };
  }
  emit();
}
