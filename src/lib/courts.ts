import type { Case, CourtType, Side } from "./types";

export const COURT_TYPES: { id: CourtType; label: string; short: string }[] = [
  { id: "SCI", label: "Supreme Court of India", short: "SCI" },
  { id: "HC", label: "High Court", short: "HC" },
  { id: "DC", label: "District / Subordinate Court", short: "DC" },
  { id: "CAT", label: "Central Administrative Tribunal", short: "CAT" },
  { id: "DRT", label: "Debts Recovery Tribunal", short: "DRT" },
  { id: "DRAT", label: "Debts Recovery Appellate Tribunal", short: "DRAT" },
  { id: "NCLT", label: "National Company Law Tribunal", short: "NCLT" },
  { id: "NCLAT", label: "National Company Law Appellate Tribunal", short: "NCLAT" },
  { id: "NCDRC", label: "National Consumer Disputes Redressal Commission", short: "NCDRC" },
  { id: "SCDRC", label: "State Consumer Commission", short: "SCDRC" },
  { id: "DCDRC", label: "District Consumer Commission", short: "DCDRC" },
  { id: "OTHER", label: "Other court / tribunal", short: "Other" },
];

export const courtLabel = (t: CourtType) => COURT_TYPES.find((c) => c.id === t)?.label ?? t;
export const courtShort = (t: CourtType) => COURT_TYPES.find((c) => c.id === t)?.short ?? t;

/** Common case types by forum. The case-type field also accepts free text. */
export const CASE_TYPES: Record<CourtType, string[]> = {
  SCI: ["SLP(C)", "SLP(Crl)", "C.A.", "Crl.A.", "W.P.(C)", "W.P.(Crl)", "T.P.(C)", "T.P.(Crl)", "R.P.(C)", "R.P.(Crl)", "Curative Pet.(C)", "Cont.Pet.(C)", "M.A.", "Diary No."],
  HC: [
    "W.P.(C)", "W.P.(Crl)", "PIL", "W.A.", "LPA", "RFA", "RSA", "FAO", "CRP", "CM(M)", "CS(OS)", "CS(COMM)", "Arb.P.", "O.M.P.(COMM)",
    "Crl.A.", "Crl.Rev.P.", "Crl.M.C.", "Bail Appln.", "Anticipatory Bail", "Cont.Cas.(C)", "MAC.APP.", "Tax Appeal", "Review Pet.",
  ],
  DC: [
    "O.S. / C.S. (Civil Suit)", "CS (Commercial)", "Execution Petition", "Civil Appeal", "Misc. Civil", "Rent Control", "Succession / Probate",
    "MACT Claim", "HMA Petition (Divorce)", "Guardianship", "Maintenance (S.125 CrPC / S.144 BNSS)", "DV Act", "Complaint Case (C.C.)",
    "NI Act S.138", "Sessions Case (S.C.)", "Criminal Case", "Bail Application", "Anticipatory Bail", "Criminal Revision", "Criminal Appeal",
  ],
  CAT: ["O.A.", "R.A.", "C.P.", "M.A.", "T.A."],
  DRT: ["O.A.", "S.A. (SARFAESI)", "T.A.", "I.A.", "R.C."],
  DRAT: ["Appeal", "M.A.", "I.A."],
  NCLT: ["C.P.(IB)", "C.P.", "I.A.", "C.A.", "M.A."],
  NCLAT: ["Comp. App.(AT)(Ins)", "Comp. App.(AT)", "I.A."],
  NCDRC: ["C.C.", "F.A.", "R.P.", "E.A.", "M.A."],
  SCDRC: ["C.C.", "F.A.", "R.P.", "E.A.", "M.A."],
  DCDRC: ["C.C.", "E.A.", "M.A."],
  OTHER: [],
};

export const SIDES: Side[] = ["Petitioner", "Respondent", "Appellant", "Plaintiff", "Defendant", "Complainant", "Accused", "Applicant", "Opposite Party", "Other"];

export const STAGES = [
  "Admission",
  "Notice",
  "Service",
  "Pleadings / Reply",
  "Framing of issues",
  "Evidence (Plaintiff / Prosecution)",
  "Evidence (Defendant / Defence)",
  "Statement u/s 313 CrPC / 351 BNSS",
  "Arguments",
  "Orders",
  "Judgment reserved",
  "Judgment",
  "Execution",
  "Compliance",
  "Mediation / Lok Adalat",
];

export const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand",
  "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

/** Official case-status pages. None offers a public API, so EnkLaw links out. */
export const OFFICIAL_LINKS: Record<CourtType, { label: string; url: string }[]> = {
  SCI: [
    { label: "SCI case status (case no.)", url: "https://www.sci.gov.in/case-status-case-no/" },
    { label: "SCI case status (diary no.)", url: "https://www.sci.gov.in/case-status-diary-no/" },
  ],
  HC: [{ label: "High Court services (eCourts)", url: "https://hcservices.ecourts.gov.in/" }],
  DC: [{ label: "eCourts — search by CNR", url: "https://services.ecourts.gov.in/ecourtindia_v6/" }],
  CAT: [{ label: "CAT official site", url: "https://cgat.gov.in/" }],
  DRT: [{ label: "DRT official site", url: "https://drt.gov.in/" }],
  DRAT: [{ label: "DRT / DRAT official site", url: "https://drt.gov.in/" }],
  NCLT: [{ label: "NCLT official site", url: "https://nclt.gov.in/" }],
  NCLAT: [{ label: "NCLAT official site", url: "https://nclat.nic.in/" }],
  NCDRC: [{ label: "e-Jagriti (consumer commissions)", url: "https://e-jagriti.gov.in/" }],
  SCDRC: [{ label: "e-Jagriti (consumer commissions)", url: "https://e-jagriti.gov.in/" }],
  DCDRC: [{ label: "e-Jagriti (consumer commissions)", url: "https://e-jagriti.gov.in/" }],
  OTHER: [],
};

/** "W.P.(C) 1234/2026" style number. */
export function caseNo(c: Pick<Case, "caseType" | "caseNumber" | "caseYear" | "diaryNumber">): string {
  if (c.caseNumber) return `${c.caseType ? `${c.caseType} ` : ""}${c.caseNumber}${c.caseYear ? `/${c.caseYear}` : ""}`;
  if (c.diaryNumber) return `Diary No. ${c.diaryNumber}${c.caseYear ? `/${c.caseYear}` : ""}`;
  return c.caseType ?? "";
}

export const isValidCnr = (cnr: string) => /^[A-Z]{4}\d{12}$/.test(cnr.replace(/[\s-]/g, "").toUpperCase());

/** Annexure prefix convention: P- for petitioner/appellant side, R- for respondent side. */
export function annexurePrefix(side: Side): string {
  if (["Respondent", "Defendant", "Accused", "Opposite Party"].includes(side)) return "R-";
  if (side === "Other") return "";
  return "P-";
}
