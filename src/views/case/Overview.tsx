import { useState } from "react";
import type { Case, CourtType, Party, Side } from "../../lib/types";
import { deleteCase, updateCase } from "../../lib/store";
import { uid } from "../../lib/id";
import { CASE_TYPES, COURT_TYPES, OFFICIAL_LINKS, SIDES, STAGES, STATES, isValidCnr } from "../../lib/courts";
import { Field, Section } from "../../components/ui";

export function Overview({ c }: { c: Case }) {
  const set = <K extends keyof Case>(k: K, v: Case[K]) => updateCase(c.id, (x) => ({ ...x, [k]: v }));
  const setClient = (k: keyof Case["client"], v: string) => updateCase(c.id, (x) => ({ ...x, client: { ...x.client, [k]: v } }));
  const [party, setParty] = useState<Omit<Party, "id">>({ name: "", side: "", advocate: "", contact: "" });
  const [copied, setCopied] = useState(false);
  const links = OFFICIAL_LINKS[c.courtType];
  const isCriminal = /crl|bail|criminal|sessions|complaint|138|DV/i.test(c.caseType ?? "") || !!c.firNumber;

  return (
    <div className="stack">
      {links.length > 0 && (
        <div className="official">
          <span className="small">Check status on the official website:</span>
          {links.map((l) => (
            <a key={l.url} className="btn" href={l.url} target="_blank" rel="noreferrer">
              {l.label} ↗
            </a>
          ))}
          {c.cnr && (
            <button
              className="btn"
              onClick={async () => {
                await navigator.clipboard.writeText(c.cnr!.replace(/[\s-]/g, "").toUpperCase());
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "CNR copied" : "Copy CNR"}
            </button>
          )}
        </div>
      )}

      <Section title="Case details">
        <div className="form-grid">
          <Field label="Cause title">
            <input value={c.title} onChange={(e) => set("title", e.target.value)} placeholder="Ram Kumar vs. State of U.P." />
          </Field>
          <Field label="Forum">
            <select value={c.courtType} onChange={(e) => set("courtType", e.target.value as CourtType)}>
              {COURT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Court / bench name">
            <input value={c.court ?? ""} onChange={(e) => set("court", e.target.value)} placeholder="High Court of Delhi / Addl. Sessions Judge, Saket" />
          </Field>
          <Field label="State">
            <input list="states" value={c.state ?? ""} onChange={(e) => set("state", e.target.value)} />
            <datalist id="states">
              {STATES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="District / seat">
            <input value={c.district ?? ""} onChange={(e) => set("district", e.target.value)} />
          </Field>
          <Field label="Case type">
            <input list="case-types" value={c.caseType ?? ""} onChange={(e) => set("caseType", e.target.value)} placeholder="Choose or type" />
            <datalist id="case-types">
              {CASE_TYPES[c.courtType].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <Field label="Case number">
            <input value={c.caseNumber ?? ""} onChange={(e) => set("caseNumber", e.target.value)} placeholder="1234" />
          </Field>
          <Field label="Year">
            <input value={c.caseYear ?? ""} onChange={(e) => set("caseYear", e.target.value)} placeholder="2026" inputMode="numeric" />
          </Field>
          {c.courtType === "SCI" ? (
            <Field label="Diary number">
              <input value={c.diaryNumber ?? ""} onChange={(e) => set("diaryNumber", e.target.value)} />
            </Field>
          ) : (
            <Field label="CNR number" hint={c.cnr && !isValidCnr(c.cnr) ? "A CNR is 16 characters: 4 letters + 12 digits" : "16-character eCourts case ID"}>
              <input value={c.cnr ?? ""} onChange={(e) => set("cnr", e.target.value.toUpperCase())} placeholder="DLCT010012342026" />
            </Field>
          )}
          <Field label="Filing date">
            <input type="date" value={c.filingDate ?? ""} onChange={(e) => set("filingDate", e.target.value)} />
          </Field>
          <Field label="Acts / sections">
            <input value={c.actsSections ?? ""} onChange={(e) => set("actsSections", e.target.value)} placeholder="S.138 NI Act; Ss.318, 316(2) BNS" />
          </Field>
          {isCriminal && (
            <>
              <Field label="FIR no.">
                <input value={c.firNumber ?? ""} onChange={(e) => set("firNumber", e.target.value)} placeholder="123/2026" />
              </Field>
              <Field label="Police station">
                <input value={c.policeStation ?? ""} onChange={(e) => set("policeStation", e.target.value)} />
              </Field>
            </>
          )}
          <Field label="We appear for">
            <select value={c.side} onChange={(e) => set("side", e.target.value as Side)}>
              {SIDES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Judge / bench">
            <input value={c.judge ?? ""} onChange={(e) => set("judge", e.target.value)} />
          </Field>
          <Field label="Stage">
            <input list="stages-ov" value={c.stage ?? ""} onChange={(e) => set("stage", e.target.value)} />
            <datalist id="stages-ov">
              {STAGES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Status">
            <select value={c.status} onChange={(e) => set("status", e.target.value as Case["status"])}>
              <option value="pending">Pending</option>
              <option value="reserved">Judgment reserved</option>
              <option value="disposed">Disposed</option>
            </select>
          </Field>
          {c.status === "disposed" && (
            <>
              <Field label="Disposal date">
                <input type="date" value={c.disposalDate ?? ""} onChange={(e) => set("disposalDate", e.target.value)} />
              </Field>
              <Field label="Nature of disposal">
                <input value={c.disposalNature ?? ""} onChange={(e) => set("disposalNature", e.target.value)} placeholder="Allowed / Dismissed / Withdrawn…" />
              </Field>
            </>
          )}
          <Field label="Tags">
            <input value={c.tags ?? ""} onChange={(e) => set("tags", e.target.value)} placeholder="urgent, bank panel…" />
          </Field>
        </div>
        <Field label="Facts / brief summary" hint="The AI uses this as background for every answer and draft.">
          <textarea rows={5} value={c.summary ?? ""} onChange={(e) => set("summary", e.target.value)} />
        </Field>
        <Field label="Relief sought / objective">
          <textarea rows={2} value={c.goals ?? ""} onChange={(e) => set("goals", e.target.value)} />
        </Field>
      </Section>

      <Section title="Client">
        <div className="form-grid">
          <Field label="Name">
            <input value={c.client.name ?? ""} onChange={(e) => setClient("name", e.target.value)} />
          </Field>
          <Field label="Phone">
            <input value={c.client.phone ?? ""} onChange={(e) => setClient("phone", e.target.value)} inputMode="tel" />
          </Field>
          <Field label="Email">
            <input value={c.client.email ?? ""} onChange={(e) => setClient("email", e.target.value)} inputMode="email" />
          </Field>
          <Field label="Address">
            <input value={c.client.address ?? ""} onChange={(e) => setClient("address", e.target.value)} />
          </Field>
        </div>
        {c.client.phone && (
          <div className="row">
            <a className="btn" href={`tel:${c.client.phone}`}>
              Call
            </a>
            <a className="btn" href={`https://wa.me/${c.client.phone.replace(/\D/g, "").replace(/^(?!91)(\d{10})$/, "91$1")}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </div>
        )}
      </Section>

      <Section title="Parties & advocates">
        {c.parties.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Advocate</th>
                <th>Contact</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {c.parties.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.side}</td>
                  <td>{p.advocate}</td>
                  <td>{p.contact}</td>
                  <td>
                    <button className="link danger" onClick={() => set("parties", c.parties.filter((x) => x.id !== p.id))}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!party.name.trim()) return;
            set("parties", [...c.parties, { ...party, id: uid() }]);
            setParty({ name: "", side: "", advocate: "", contact: "" });
          }}
        >
          <input placeholder="Name" value={party.name} onChange={(e) => setParty({ ...party, name: e.target.value })} />
          <input placeholder="Status (e.g. Respondent No. 2)" value={party.side} onChange={(e) => setParty({ ...party, side: e.target.value })} />
          <input placeholder="Advocate" value={party.advocate} onChange={(e) => setParty({ ...party, advocate: e.target.value })} />
          <input placeholder="Contact / address" value={party.contact} onChange={(e) => setParty({ ...party, contact: e.target.value })} />
          <button className="btn">Add</button>
        </form>
      </Section>

      <div className="row end">
        <button className="btn danger" onClick={() => confirm(`Delete "${c.title}" and everything in it? This cannot be undone.`) && deleteCase(c.id)}>
          Delete case
        </button>
      </div>
    </div>
  );
}
