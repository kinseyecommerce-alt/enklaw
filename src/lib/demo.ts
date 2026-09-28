import type { Case } from "./types";
import { addDays, todayISO } from "./dates";

/** True in the hosted demo build (VITE_DEMO=1), which has no API server. */
export const IS_DEMO = import.meta.env.VITE_DEMO === "1";

/** Example cases for the demo, dated relative to today. */
export function demoCases(): Case[] {
  const t = todayISO();
  const d = (n: number) => addDays(t, n);
  let n = 0;
  const id = () => `demo${++n}`;
  const base = {
    side: "Petitioner" as const,
    status: "pending" as const,
    client: {},
    createdAt: new Date().toISOString(),
    parties: [],
    orders: [],
    tasks: [],
    annexures: [],
    timeline: [],
    drafts: [],
    notes: [],
    chat: [],
  };
  return [
    {
      ...base,
      id: id(),
      title: "Ram Kumar vs. State (NCT of Delhi)",
      courtType: "HC",
      court: "High Court of Delhi",
      state: "Delhi",
      caseType: "Crl.M.C.",
      caseNumber: "4567",
      caseYear: "2026",
      stage: "Reply / status report",
      judge: "Hon'ble Mr. Justice A. Kumar",
      actsSections: "S.528 BNSS; FIR 211/2025 u/s 318(4) BNS",
      firNumber: "211/2025",
      policeStation: "Saket",
      client: { name: "Ram Kumar (example)", phone: "9800000000" },
      summary: "Petition to quash an FIR arising out of a commercial dispute over unpaid invoices. The dispute is civil in nature and is pending before the commercial court.",
      goals: "Quashing of FIR 211/2025; interim protection from coercive action.",
      parties: [
        { id: id(), name: "Ram Kumar", side: "Petitioner", advocate: "(you)" },
        { id: id(), name: "State (NCT of Delhi)", side: "Respondent No. 1", advocate: "APP for the State" },
        { id: id(), name: "Sanjay Gupta", side: "Respondent No. 2 (complainant)" },
      ],
      hearings: [
        { id: id(), date: d(-35), purpose: "Admission", courtHall: "31", itemNo: "22", judge: "Hon'ble Mr. Justice A. Kumar", outcome: "Notice issued; status report called. No coercive steps till next date.", nextDate: t },
        { id: id(), date: t, purpose: "Reply / status report", courtHall: "31", itemNo: "14", judge: "Hon'ble Mr. Justice A. Kumar" },
      ],
      orders: [{ id: id(), date: d(-35), title: "Notice issued; interim protection", summary: "Notice to the State and the complainant. Status report within 4 weeks. No coercive steps against the petitioner till the next date." }],
      tasks: [{ id: id(), title: "Serve advance copy on the APP", due: d(2), done: false }],
      annexures: [
        { id: id(), label: "P-1", title: "Copy of FIR 211/2025", kind: "document", date: d(-120) },
        { id: id(), label: "P-2", title: "Invoices and ledger statements", kind: "document", relevance: "Shows the dispute is about payment for goods supplied" },
      ],
      timeline: [
        { id: id(), date: d(-200), title: "Goods supplied under purchase orders", evidenceIds: [] },
        { id: id(), date: d(-120), title: "FIR registered at P.S. Saket", evidenceIds: [] },
      ],
    },
    {
      ...base,
      id: id(),
      title: "State Bank of India vs. Mehta Traders",
      courtType: "DRT",
      court: "DRT-II, Delhi",
      caseType: "O.A.",
      caseNumber: "812",
      caseYear: "2024",
      side: "Respondent",
      stage: "Evidence",
      client: { name: "Mehta Traders (example)" },
      hearings: [
        { id: id(), date: d(-20), purpose: "Written statement", courtHall: "2", outcome: "WS filed; affidavit of evidence directed", nextDate: t },
        { id: id(), date: t, purpose: "Evidence", courtHall: "2", itemNo: "7" },
      ],
    },
    {
      ...base,
      id: id(),
      title: "Priya Electronics vs. Ace Distributors",
      courtType: "DC",
      court: "Commercial Court, Tis Hazari",
      caseType: "NI Act S.138",
      caseNumber: "3345",
      caseYear: "2025",
      cnr: "DLCT010033452025",
      side: "Complainant",
      stage: "Evidence (Plaintiff / Prosecution)",
      hearings: [
        { id: id(), date: t, purpose: "Complainant evidence", courtHall: "204", itemNo: "31" },
        { id: id(), date: d(3), purpose: "Arguments on application", courtHall: "204" },
      ],
    },
    {
      ...base,
      id: id(),
      title: "Sunita Sharma vs. Rajesh Sharma",
      courtType: "DC",
      court: "Family Court, Saket",
      caseType: "HMA Petition (Divorce)",
      caseNumber: "1290",
      caseYear: "2025",
      cnr: "DLST020012902025",
      stage: "Mediation / Lok Adalat",
      hearings: [{ id: id(), date: d(-6), purpose: "Mediation", courtHall: "Mediation Centre" }],
    },
    {
      ...base,
      id: id(),
      title: "Anil Verma vs. Union of India",
      courtType: "SCI",
      court: "Supreme Court of India",
      caseType: "SLP(C)",
      diaryNumber: "45621",
      caseYear: "2026",
      stage: "Admission",
      hearings: [{ id: id(), date: d(1), purpose: "Admission", courtHall: "5", itemNo: "38" }],
      tasks: [{ id: id(), title: "Remove office objections", due: d(-1), done: false }],
    },
    {
      ...base,
      id: id(),
      title: "Kiran Devi vs. Oriental Insurance",
      courtType: "DCDRC",
      court: "District Consumer Commission, New Delhi",
      caseType: "C.C.",
      caseNumber: "77",
      caseYear: "2026",
      side: "Complainant",
      stage: "Arguments",
      hearings: [{ id: id(), date: d(-60), purpose: "Arguments", outcome: "Adjourned sine die" }],
    },
  ];
}
