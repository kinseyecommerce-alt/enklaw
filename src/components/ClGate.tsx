export function ClGate() {
  return (
    <div className="notice">
      <strong>Court records need a free CourtListener token.</strong> Sign up at{" "}
      <a href="https://www.courtlistener.com/sign-in/" target="_blank" rel="noreferrer">
        courtlistener.com
      </a>
      , copy the API token shown in your CourtListener profile (see the{" "}
      <a href="https://www.courtlistener.com/help/api/rest/" target="_blank" rel="noreferrer">
        API help page
      </a>
      ), add <code>COURTLISTENER_API_TOKEN=…</code> to your <code>.env</code> file, and restart <code>npm run dev</code>.
    </div>
  );
}
