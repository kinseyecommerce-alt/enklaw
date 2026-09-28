export type Role = "Plaintiff" | "Defendant" | "Petitioner" | "Respondent" | "Appellant" | "Appellee" | "Other";

export interface Party {
  id: string;
  name: string;
  role: string;
  contact?: string;
  attorney?: string;
}

export interface Deadline {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  kind: "deadline" | "hearing" | "trial" | "meeting" | "other";
  location?: string;
  notes?: string;
  done: boolean;
}

export interface Evidence {
  id: string;
  exhibit: string; // e.g. "A", "1"
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
  title: string;
  caseNumber?: string;
  court?: string;
  jurisdiction?: string; // e.g. "California", "Federal – N.D. Cal."
  judge?: string;
  caseType?: string;
  myRole: Role;
  status: "active" | "closed" | "appeal";
  summary?: string;
  goals?: string;
  createdAt: string;
  parties: Party[];
  deadlines: Deadline[];
  evidence: Evidence[];
  timeline: TimelineEvent[];
  drafts: Draft[];
  notes: Note[];
  chat: ChatMessage[];
}
