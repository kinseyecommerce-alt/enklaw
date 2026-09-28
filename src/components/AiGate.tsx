export function AiGate() {
  return (
    <div className="notice">
      <strong>AI features need an API key.</strong> Copy <code>.env.example</code> to <code>.env</code>, set <code>ANTHROPIC_API_KEY</code>, and
      restart <code>npm run dev</code>. Everything else in EnkLaw works without it.
    </div>
  );
}
