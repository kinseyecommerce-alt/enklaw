import type { ReactNode } from "react";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <div>{children}</div>}
    </div>
  );
}

export function Section({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      <header className="card-head">
        <h2>{title}</h2>
        {actions && <div className="row">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

export function DueBadge({ days, done }: { days: number; done?: boolean }) {
  if (done) return <span className="badge ok">done</span>;
  const cls = days < 0 ? "bad" : days <= 3 ? "bad" : days <= 14 ? "warn" : "muted";
  const label = days < 0 ? `${-days}d overdue` : days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days}d`;
  return <span className={`badge ${cls}`}>{label}</span>;
}
