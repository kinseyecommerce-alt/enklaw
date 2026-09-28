import type { OrderExtract } from "./api";
import type { Case } from "./types";
import { recordHearing } from "./diary";

/**
 * Applies an AI-read order to the diary: saves the order, records the outcome on the
 * hearing of that date (creating it if missing), lists the next date, and adds compliances.
 */
export function applyOrder(c: Case, o: OrderExtract, fileName: string | undefined, newId: () => string): Case {
  const date = o.order_date || new Date().toISOString().slice(0, 10);
  let next: Case = {
    ...c,
    judge: c.judge || o.judge || undefined,
    orders: [...c.orders, { id: newId(), date, title: o.title || "Order", summary: o.summary, fileName }],
    tasks: [
      ...c.tasks,
      ...o.compliances.filter((t) => t.task.trim()).map((t) => ({ id: newId(), title: t.task, due: t.due_date || o.next_date || date, done: false })),
    ],
  };
  let hearing = next.hearings.find((h) => h.date === date);
  if (!hearing) {
    hearing = { id: newId(), date, judge: o.judge || undefined };
    next = { ...next, hearings: [...next.hearings, hearing] };
  }
  return recordHearing(next, hearing.id, { outcome: o.outcome || o.title, nextDate: o.next_date, nextPurpose: o.next_purpose, disposed: o.disposed }, newId);
}
