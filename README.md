# EnkLaw — personal court assistant

A private, local-first app for people representing themselves in court. It helps you organize a case, keep track of deadlines, log evidence, and draft court documents with an AI assistant (Claude).

> EnkLaw provides legal information and drafting help, **not legal advice**. Court rules and deadlines vary by jurisdiction. Always check your court's rules, the clerk, or a self-help center, and consider a licensed attorney or legal aid.

## Features

| Area | What it does |
|---|---|
| **Cases** | Case number, court, jurisdiction, judge, your role, a summary, your goals, and the parties/attorneys involved. |
| **Deadlines & hearings** | Track filing deadlines, hearings, trials, and mediations, with overdue and due-soon badges. Export to Google/Apple/Outlook calendars as `.ics`, with a reminder the day before. |
| **Deadline calculator** | Counts calendar days or court days, adds extra days for the service method, skips U.S. federal holidays and any local closure dates you enter, and rolls weekend or holiday deadlines to the next court day. Shows each step. Comes with presets for common FRCP and California rules. |
| **Evidence log** | Exhibit numbering (numbers for plaintiffs, letters for defendants), with source, date, description, and why each item matters. Export an exhibit list to Word. |
| **Timeline** | A dated chronology of events linked to exhibits. Export to Word. |
| **AI assistant** | A chat that knows your whole case file. You can turn on web search to look up current rules and law. |
| **Document drafting** | Answers, motions, declarations, oppositions, demand letters, discovery, proofs of service, notices of appeal, and more. Edit, then export to Word (`.doc`), Markdown, or print to PDF. |
| **Document analyzer** | Upload a PDF or text file (complaint, motion, order, notice) to get a plain-English summary, the dates and deadlines it triggers, the key statements, and next steps. |
| **Hearing prep** | An opening statement, key points tied to your exhibits, questions the judge is likely to ask, the other side's arguments, and a checklist of what to bring. |
| **Notes & backup** | Per-case notes, plus JSON export and import of all your data. |

Your data is stored only in your browser (`localStorage`). The only things that leave your machine are the requests you send to the Anthropic API when you use an AI feature.

## Setup

Requires Node.js 22 or newer.

```bash
npm install
cp .env.example .env      # then put your key in ANTHROPIC_API_KEY
npm run dev               # opens the web app on http://localhost:5173 (API on :8787)
```

Get an API key at <https://console.anthropic.com>. Everything except the AI features works without a key.

To run a production build on a single port:

```bash
npm run build
npm start                 # http://localhost:8787
```

### Configuration (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Needed for the AI features |
| `ENKLAW_MODEL` | `claude-opus-5` | The Claude model to use |
| `PORT` | `8787` | Port for the API server |

AI requests use adaptive thinking and streaming. They also turn on Anthropic's server-side refusal fallback (`fallbacks: "default"`), so a request declined by a safety classifier is retried on a fallback model instead of failing.

## Development

```bash
npm test          # deadline-calculation unit tests
npm run typecheck
```

Project layout:

```
server/        Express API that calls Claude (chat, draft, analyze, hearing-prep)
src/lib/       data model, localStorage store, deadline math, .ics export, case-context builder
src/views/     one file per screen
src/components shared UI
```

## Limitations

- The holiday calendar is U.S. **federal** only. State courts observe other holidays (for example, California's Cesar Chavez Day and Native American Day). Add those in the calculator's "extra court closure dates" field.
- Only the file name of an evidence file is stored; keep the originals somewhere safe.
- Browser storage is limited to about 5 MB, so export backups regularly.
