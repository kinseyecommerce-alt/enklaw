import { describe, expect, it } from "vitest";
import { applyOrder } from "./orders";
import type { Case } from "./types";

const base: Case = {
  id: "c",
  title: "A vs B",
  courtType: "HC",
  side: "Petitioner",
  status: "pending",
  client: {},
  createdAt: "",
  parties: [],
  hearings: [{ id: "h1", date: "2026-09-28", purpose: "Admission", courtHall: "4" }],
  orders: [],
  tasks: [],
  annexures: [],
  timeline: [],
  drafts: [],
  notes: [],
  chat: [],
};

let n = 0;
const id = () => `id${++n}`;

describe("applyOrder", () => {
  it("updates the matching hearing, lists the next date and adds compliances", () => {
    const c = applyOrder(
      base,
      {
        order_date: "2026-09-28",
        title: "Notice issued",
        summary: "Issue notice to respondents.",
        outcome: "Notice issued, returnable 02-11-2026",
        judge: "Hon'ble Mr. Justice X",
        next_date: "2026-11-02",
        next_date_note: "",
        next_purpose: "Reply",
        disposed: false,
        compliances: [{ task: "File process fee and copies for service", due_date: "2026-10-05" }],
      },
      "order.pdf",
      id,
    );
    expect(c.orders).toHaveLength(1);
    expect(c.hearings.find((h) => h.id === "h1")?.outcome).toMatch(/Notice issued/);
    expect(c.hearings.some((h) => h.date === "2026-11-02" && h.courtHall === "4")).toBe(true);
    expect(c.tasks[0]).toMatchObject({ due: "2026-10-05", done: false });
    expect(c.judge).toBe("Hon'ble Mr. Justice X");
  });

  it("creates a hearing when none exists on the order date", () => {
    const c = applyOrder(base, { order_date: "2026-08-01", title: "Adjourned", summary: "", outcome: "Adjourned", judge: "", next_date: "", next_date_note: "", next_purpose: "", disposed: false, compliances: [] }, undefined, id);
    expect(c.hearings.find((h) => h.date === "2026-08-01")?.outcome).toBe("Adjourned");
  });
});
