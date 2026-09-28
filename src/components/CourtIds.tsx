/** A few common CourtListener court IDs. The full list is at courtlistener.com/help/api/jurisdictions/. */
export const COMMON_COURTS: [string, string][] = [
  ["", "All courts"],
  ["scotus", "U.S. Supreme Court"],
  ["ca1 ca2 ca3 ca4 ca5 ca6 ca7 ca8 ca9 ca10 ca11 cadc cafc", "All federal courts of appeals"],
  ["ca9", "9th Circuit"],
  ["ca2", "2nd Circuit"],
  ["ca5", "5th Circuit"],
  ["cand cacd casd caed", "California federal district courts"],
  ["nysd nyed nynd nywd", "New York federal district courts"],
  ["txsd txnd txed txwd", "Texas federal district courts"],
  ["flsd flmd flnd", "Florida federal district courts"],
  ["cal calctapp", "California Supreme Court & Courts of Appeal"],
  ["ny nyappdiv", "New York Court of Appeals & Appellate Division"],
  ["tex texapp", "Texas Supreme Court & Courts of Appeals"],
  ["fla fladistctapp", "Florida Supreme Court & District Courts of Appeal"],
  ["ill illappct", "Illinois Supreme Court & Appellate Court"],
];

export function CourtPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const preset = COMMON_COURTS.some(([id]) => id === value);
  return (
    <div className="stack tight">
      <select value={preset ? value : "custom"} onChange={(e) => onChange(e.target.value === "custom" ? value || " " : e.target.value)}>
        {COMMON_COURTS.map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
        <option value="custom">Other (enter court IDs)…</option>
      </select>
      {!preset && (
        <input
          value={value.trim()}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Space-separated CourtListener court IDs, e.g. cal calctapp"
        />
      )}
    </div>
  );
}
