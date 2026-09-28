# EnkLaw — case diary & legal assistant for Indian courts

A personal, local-first case diary for advocates and litigants in India, with an AI assistant (Claude) and judgment search (Indian Kanoon).

Forums: Supreme Court of India, High Courts, District / Subordinate Courts, CAT, DRT / DRAT, NCLT / NCLAT, and Consumer Commissions (NCDRC / SCDRC / DCDRC).

> EnkLaw helps you organise and draft; official court records remain the final source. Verify every date, section, citation and limitation period.

## Features

| Area | What it does |
|---|---|
| **Cause list** | Your matters for any day in item-number order, with a week strip and a one-tap **Update** to record the outcome and next date. Copy the list for WhatsApp or print it. Also shows hearings that were never updated, compliances due this week, and cases whose next date is awaited. Export hearings to Google, Outlook or phone calendars (`.ics`). |
| **Cases** | Search by party, case number, CNR, client or FIR, and filter by forum and status. Each case stores its forum, court or bench, Indian case type (SLP(C), W.P.(C), Crl.M.C., O.S., S.138 NI Act…), number and year, CNR or SCI diary number, FIR and police station, acts and sections, stage, and client contact with Call and WhatsApp buttons. |
| **Hearings** | The full hearing history. Recording an outcome lists the case on its next date automatically, carrying over the court hall and judge. |
| **Orders + AI order reader** | Upload an order or proceeding sheet (PDF or photo). The AI extracts the outcome, next date, purpose, judge and compliance directions; you confirm them and they are applied to the diary. |
| **Compliances** | Tasks with due dates, such as filing a reply in 4 weeks or paying process fee. |
| **Annexures** | P-1 / R-1 labelling, with export of the index to Word. |
| **List of dates** | Dated events linked to annexures, exported as a "List of Dates and Events". |
| **AI assistant** | Knows the whole case file and answers in English or Hindi. It applies BNS / BNSS / BSA and the older IPC / CrPC / Evidence Act as appropriate, and can research real judgments on Indian Kanoon. |
| **Drafting** | Legal notices, S.138 notice and complaint, plaint, written statement, O.39 injunction application, s.5 condonation, bail and anticipatory bail, quashing, writ petition, SLP with synopsis and list of dates, counter affidavit, rejoinder, consumer complaint and more, in Indian court format. Export to Word or print to PDF. **Verify citations** checks every judgment cited against Indian Kanoon. |
| **Limitation calculator** | Limitation Act, 1963: the first day is excluded (s.12(1)), certified-copy time is excluded (s.12(2)), and a closed last day moves to the reopening day (s.4). Uses your court's Saturday pattern, holidays and vacations, with 28 common periods (SLP 90 days, Art. 116, S.34 Arbitration, S.138 NI Act, CPA 2019, IBC / Companies Act, CAT, SARFAESI…). |
| **Judgments** | Indian Kanoon search by court (SC, each High Court, tribunals) and date. Save results to a case. |
| **Backup** | Export or import all your data as JSON. |

Your data is stored only in your browser (`localStorage`). It leaves your machine only when you use AI features (sent to Anthropic) or judgment search (sent to Indian Kanoon).

## Setup

Requires Node.js 22 or newer.

```bash
npm install
cp .env.example .env      # add ANTHROPIC_API_KEY and INDIANKANOON_API_TOKEN
npm run dev               # http://localhost:5173
```

The diary, cause list and limitation calculator work without any keys.

Production build on one port: `npm run build && npm start` → http://localhost:8787

## Getting case status from courts

Indian court portals (sci.gov.in, eCourts, High Court sites, tribunals) offer **no public API**, and their search pages require a CAPTCHA typed by a person. Apps like Court Assistant fetch status from those official sites on their own servers. EnkLaw currently:

- links each case to its court's official status page (and copies the CNR for you), and
- reads orders you download (PDF or photo) to update the diary automatically.

Automatic sync (an in-app lookup where you type the CAPTCHA, or a paid court-data API) is a planned addition.

## Development

```bash
npm test          # limitation, diary and order-apply unit tests
npm run typecheck
```

```
server/        Express API: Claude (chat, drafting, analysis, order reader, citation check), Indian Kanoon proxy
src/lib/       data model, courts & case types, diary logic, limitation math, calendar export
src/views/     cause list, cases, limitation, judgments, settings; case/ holds the per-case tabs
```
