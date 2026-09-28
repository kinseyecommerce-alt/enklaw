export function AiGate() {
  return (
    <div className="notice">
      <strong>AI features need an API key.</strong> Copy <code>.env.example</code> to <code>.env</code>, set <code>ANTHROPIC_API_KEY</code>, and
      restart <code>npm run dev</code>. The case diary works without it.
    </div>
  );
}

export function IkGate() {
  return (
    <div className="notice">
      <strong>Judgment search needs an Indian Kanoon API token.</strong> Sign up at{" "}
      <a href="https://api.indiankanoon.org/" target="_blank" rel="noreferrer">
        api.indiankanoon.org
      </a>{" "}
      (₹500 free credit; non-commercial users can apply for ₹10,000/month), then add <code>INDIANKANOON_API_TOKEN=…</code> to <code>.env</code> and
      restart.
    </div>
  );
}
