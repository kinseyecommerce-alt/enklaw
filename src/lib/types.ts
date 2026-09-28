export type CourtType = "SCI" | "HC" | "DC" | "CAT" | "DRT" | "DRAT" | "NCLT" | "NCLAT" | "NCDRC" | "SCDRC" | "DCDRC" | "OTHER";

export type Side =
  | "Petitioner"
  | "Respondent"
  | "Appellant"
  | "Plaintiff"
  | "Defendant"
  | "Complainant"
  | "Accused"
  | "Applicant"
  | "Opposite Party"
  | "Other";

export interface Party {
  id: string;
  name: string;
  side: string; // e.g. "Petitioner No. 1", "Respondent"
  advocate?: string;
  contact?: string;
}

export interface Client {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

/** One listing of the case before the court. The diary's core record. */
export interface Hearing {
  id: string;
  date: string; // YYYY-MM-DD
  purpose?: string; // e.g. "Admission", "Arguments", "Evidence"
  courtHall?: string;
  itemNo?: string;
  judge?: string;
  /** What happened. Empty = not yet updated. */
  outcome?: string;
  nextDate?: string;
}

export interface Order {
  id: string;
  date: string;
  title: string;
  summary?: string;
  fileName?: string;
  link?: string;
}

export interface Task {
  id: string;
  title: string;
  due: string;
  done: boolean;
  notes?: string;
}

export interface Annexure {
  id: string;
  label: string; // "P-1", "R-1", "Exhibit A"
  title: string;
  kind: "document" | "photo" | "video" | "audio" | "message" | "record" | "other";
  date?: string;
  source?: string;
  description?: string;
  relevance?: string;
  fileName?: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  evidenceIds: string[];
}

export interface Draft {
  id: string;
  title: string;
  docType: string;
  body: string;
  updatedAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

export interface Case {
  id: string;
  title: string; // cause title, e.g. "Ram Kumar vs. State of U.P."
  courtType: CourtType;
  court?: string; // "High Court of Delhi", "District Court, Saket"
  state?: string;
  district?: string;
  bench?: string;
  caseType?: string; // "W.P.(C)", "SLP(Crl)", "O.S."
  caseNumber?: string;
  caseYear?: string;
  cnr?: string; // 16-character eCourts CNR
  diaryNumber?: string; // Supreme Court diary number
  filingDate?: string;
  firNumber?: string;
  policeStation?: string;
  actsSections?: string; // "S. 138 NI Act", "Ss. 318, 316(2) BNS"
  side: Side;
  judge?: string;
  stage?: string;
  status: "pending" | "reserved" | "disposed";
  disposalDate?: string;
  disposalNature?: string;
  client: Client;
  summary?: string;
  goals?: string;
  tags?: string;
  createdAt: string;
  parties: Party[];
  hearings: Hearing[];
  orders: Order[];
  tasks: Task[];
  annexures: Annexure[];
  timeline: TimelineEvent[];
  drafts: Draft[];
  notes: Note[];
  chat: ChatMessage[];
}
