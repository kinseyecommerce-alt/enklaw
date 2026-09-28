import { useState } from "react";
import type { Case, Party, Role } from "../lib/types";
import { deleteCase, updateCase } from "../lib/store";
import { uid } from "../lib/id";
import { Field, Section } from "../components/ui";

const ROLES: Role[] = ["Plaintiff", "Defendant", "Petitioner", "Respondent", "Appellant", "Appellee", "Other"];

export function Overview({ c }: { c: Case }) {
  const set = <K extends keyof Case>(k: K, v: Case[K]) => updateCase(c.id, (x) => ({ ...x, [k]: v }));
  const [party, setParty] = useState<Omit<Party, "id">>({ name: "", role: "", contact: "", attorney: "" });

  return (
    <div className="stack">
      <Section title="Case details">
        <div className="form-grid">
          <Field label="Case name">
            <input value={c.title} onChange={(e) => set("title", e.target.value)} placeholder="Smith v. Jones" />
          </Field>
          <Field label="Case number">
            <input value={c.caseNumber ?? ""} onChange={(e) => set("caseNumber", e.target.value)} placeholder="e.g. 24-CV-01234" />
          </Field>
          <Field label="Court">
            <input value={c.court ?? ""} onChange={(e) => set("court", e.target.value)} placeholder="Superior Court of California, County of…" />
          </Field>
          <Field label="Jurisdiction / state">
            <input value={c.jurisdiction ?? ""} onChange={(e) => set("jurisdiction", e.target.value)} placeholder="California / Federal – S.D.N.Y." />
          </Field>
          <Field label="Judge / department">
            <input value={c.judge ?? ""} onChange={(e) => set("judge", e.target.value)} />
          </Field>
          <Field label="Case type">
            <input value={c.caseType ?? ""} onChange={(e) => set("caseType", e.target.value)} placeholder="Small claims, eviction, family, civil…" />
          </Field>
          <Field label="My role">
            <select value={c.myRole} onChange={(e) => set("myRole", e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={c.status} onChange={(e) => set("status", e.target.value as Case["status"])}>
              <option value="active">Active</option>
              <option value="appeal">On appeal</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
        </div>
        <Field label="What is this case about?" hint="The AI uses this summary as background for every answer.">
          <textarea rows={5} value={c.summary ?? ""} onChange={(e) => set("summary", e.target.value)} />
        </Field>
        <Field label="What outcome do I want?">
          <textarea rows={3} value={c.goals ?? ""} onChange={(e) => set("goals", e.target.value)} />
        </Field>
      </Section>

      <Section title="Parties & people">
        {c.parties.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Attorney</th>
                <th>Contact</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {c.parties.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.role}</td>
                  <td>{p.attorney}</td>
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
            setParty({ name: "", role: "", contact: "", attorney: "" });
          }}
        >
          <input placeholder="Name" value={party.name} onChange={(e) => setParty({ ...party, name: e.target.value })} />
          <input placeholder="Role (e.g. Defendant, Witness)" value={party.role} onChange={(e) => setParty({ ...party, role: e.target.value })} />
          <input placeholder="Their attorney" value={party.attorney} onChange={(e) => setParty({ ...party, attorney: e.target.value })} />
          <input placeholder="Contact / address" value={party.contact} onChange={(e) => setParty({ ...party, contact: e.target.value })} />
          <button className="btn">Add</button>
        </form>
      </Section>

      <div className="row end">
        <button
          className="btn danger"
          onClick={() => {
            if (confirm(`Delete "${c.title}" and everything in it? This cannot be undone.`)) deleteCase(c.id);
          }}
        >
          Delete case
        </button>
      </div>
    </div>
  );
}
