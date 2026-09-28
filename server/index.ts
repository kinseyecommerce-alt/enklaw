import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, DRAFT_INSTRUCTIONS, ANALYZE_INSTRUCTIONS, HEARING_INSTRUCTIONS } from "./prompts.ts";
import * as cl from "./courtlistener.ts";
import { CASE_LAW_TOOLS, runCaseLawTool } from "./tools.ts";

// Load .env if present (Node 22+ built-in).
try {
  process.loadEnvFile();
} catch {
  // no .env file; rely on the real environment
}

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.ENKLAW_MODEL ?? "claude-opus-5";
const here = path.dirname(fileURLToPath(import.meta.url));

// The client resolves credentials from ANTHROPIC_API_KEY (or an `ant auth login` profile).
const client = new Anthropic();
const aiConfigured = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const app = express();
app.use(express.json({ limit: "20mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, aiConfigured, model: MODEL, courtListener: cl.clConfigured() });
});

type ChatBody = {
  caseContext?: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  webSearch?: boolean;
  caseLaw?: boolean;
};

/**
 * Streams Claude's text output to the HTTP response as plain text.
 * Runs the tool loop for the CourtListener tools, continues `pause_turn`
 * (server-side web search hitting its iteration limit), and surfaces
 * refusals instead of returning silence.
 */
async function streamToResponse(
  res: express.Response,
  opts: { system: string; messages: Anthropic.Beta.BetaMessageParam[]; webSearch?: boolean; caseLaw?: boolean },
) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  const messages = [...opts.messages];
  const tools: Anthropic.Beta.BetaToolUnion[] = [];
  if (opts.caseLaw && cl.clConfigured()) tools.push(...CASE_LAW_TOOLS);
  if (opts.webSearch) tools.push({ type: "web_search_20260209", name: "web_search", max_uses: 5 });

  try {
    for (let turn = 0; turn < 12; turn++) {
      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 64000,
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
        tools: tools.length ? tools : undefined,
        messages,
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          res.write(event.delta.text);
        } else if (event.type === "content_block_start" && event.content_block.type === "server_tool_use") {
          res.write("\n\n_🔎 Searching the web…_\n\n");
        } else if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
          res.write(`\n\n_⚖️ ${event.content_block.name === "verify_citations" ? "Verifying citations" : "Searching CourtListener"}…_\n\n`);
        }
      }

      const final = await stream.finalMessage();
      if (final.stop_reason === "tool_use") {
        const calls = final.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
        const results = await Promise.all(calls.map((call) => runCaseLawTool(call)));
        messages.push({ role: "assistant", content: final.content }, { role: "user", content: results });
        continue;
      }
      if (final.stop_reason === "refusal") {
        res.write("\n\n[The assistant declined to answer this request. Try rephrasing it.]");
        break;
      }
      if (final.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: final.content });
        continue;
      }
      if (final.stop_reason === "max_tokens") {
        res.write("\n\n[Response was cut off because it reached the length limit.]");
      }
      break;
    }
  } catch (err) {
    res.write(`\n\n[Error: ${describeError(err)}]`);
  }
  res.end();
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "Invalid or missing ANTHROPIC_API_KEY. Add it to your .env file and restart.";
  if (err instanceof Anthropic.RateLimitError) return "Rate limited by the API. Wait a moment and try again.";
  if (err instanceof Anthropic.BadRequestError) return `Bad request: ${err.message}`;
  if (err instanceof Anthropic.APIConnectionError) return "Could not reach the Anthropic API. Check your internet connection.";
  if (err instanceof Anthropic.APIError) return `API error ${err.status ?? ""}: ${err.message}`;
  return err instanceof Error ? err.message : String(err);
}

function withCase(caseContext: string | undefined, text: string): string {
  return caseContext ? `<case_file>\n${caseContext}\n</case_file>\n\n${text}` : text;
}

function requireAi(res: express.Response): boolean {
  if (aiConfigured) return true;
  res.status(503).type("text/plain").send("AI is not configured. Set ANTHROPIC_API_KEY in your .env file and restart the server.");
  return false;
}

app.post("/api/chat", async (req, res) => {
  if (!requireAi(res)) return;
  const body = req.body as ChatBody;
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    res.status(400).send("messages is required");
    return;
  }
  // Attach the case file to the first user turn so it stays in a stable, cacheable prefix.
  const [first, ...rest] = body.messages;
  const firstText = typeof first.content === "string" ? first.content : "";
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: withCase(body.caseContext, firstText) },
    ...rest,
  ];
  await streamToResponse(res, { system: SYSTEM_PROMPT, messages, webSearch: body.webSearch, caseLaw: body.caseLaw });
});

app.post("/api/draft", async (req, res) => {
  if (!requireAi(res)) return;
  const { caseContext, docType, instructions, caseLaw } = req.body as {
    caseContext?: string;
    docType: string;
    instructions?: string;
    caseLaw?: boolean;
  };
  const research =
    caseLaw && cl.clConfigured()
      ? "\n\nUse the CourtListener tools to find real supporting authority before citing any case, and verify every case citation you include. Do not narrate the research; output only the document and checklist."
      : "";
  const prompt = `${DRAFT_INSTRUCTIONS}${research}\n\nDocument type: ${docType}\n\nWhat I need this document to do:\n${instructions || "(no extra instructions)"}`;
  await streamToResponse(res, {
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: withCase(caseContext, prompt) }],
    caseLaw,
  });
});

app.post("/api/analyze", async (req, res) => {
  if (!requireAi(res)) return;
  const { caseContext, title, text, pdfBase64 } = req.body as {
    caseContext?: string;
    title: string;
    text?: string;
    pdfBase64?: string;
  };
  const safeTitle = (title || "document").replace(/"/g, "'");
  let content: Anthropic.Beta.BetaMessageParam["content"];
  if (pdfBase64) {
    content = [
      { type: "document", title: safeTitle, source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
      { type: "text", text: withCase(caseContext, `${ANALYZE_INSTRUCTIONS}\n\nThe document is attached above ("${safeTitle}").`) },
    ];
  } else if (text) {
    content = withCase(caseContext, `${ANALYZE_INSTRUCTIONS}\n\n<document title="${safeTitle}">\n${text}\n</document>`);
  } else {
    res.status(400).send("Provide text or pdfBase64");
    return;
  }
  await streamToResponse(res, { system: SYSTEM_PROMPT, messages: [{ role: "user", content }] });
});

app.post("/api/hearing-prep", async (req, res) => {
  if (!requireAi(res)) return;
  const { caseContext, hearing, notes } = req.body as { caseContext?: string; hearing: string; notes?: string };
  const prompt = `${HEARING_INSTRUCTIONS}\n\nHearing: ${hearing}\n\nMy notes / goals:\n${notes || "(none)"}`;
  await streamToResponse(res, {
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: withCase(caseContext, prompt) }],
  });
});

// ---------- CourtListener proxy ----------

function requireCl(res: express.Response): boolean {
  if (cl.clConfigured()) return true;
  res.status(503).json({ error: "CourtListener is not configured. Set COURTLISTENER_API_TOKEN in your .env file and restart the server." });
  return false;
}

function clHandler(fn: (req: express.Request) => Promise<unknown>): express.RequestHandler {
  return async (req, res) => {
    if (!requireCl(res)) return;
    try {
      res.json((await fn(req)) ?? { ok: true });
    } catch (e) {
      const status = e instanceof cl.CourtListenerError ? e.status : 502;
      res.status(status >= 400 && status < 600 ? status : 502).json({ error: e instanceof Error ? e.message : String(e) });
    }
  };
}

const qstr = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const searchParams = (req: express.Request): cl.SearchParams => ({
  q: qstr(req.query.q) ?? "",
  court: qstr(req.query.court),
  filedAfter: qstr(req.query.filed_after),
  filedBefore: qstr(req.query.filed_before),
  cursor: qstr(req.query.cursor),
  orderBy: qstr(req.query.order_by),
});

app.get("/api/cl/opinions", clHandler((req) => cl.searchOpinions(searchParams(req))));
app.get("/api/cl/dockets", clHandler((req) => cl.searchDockets(searchParams(req))));
app.get(
  "/api/cl/dockets/:id",
  clHandler((req) => cl.getDocket(Number(req.params.id))),
);
app.post(
  "/api/cl/citations",
  clHandler((req) => cl.checkCitations(String((req.body as { text?: string }).text ?? ""))),
);
app.post(
  "/api/cl/alerts",
  clHandler((req) => cl.createDocketAlert(Number((req.body as { docket?: number }).docket))),
);
app.delete(
  "/api/cl/alerts/:id",
  clHandler((req) => cl.deleteDocketAlert(Number(req.params.id))),
);

if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(here, "../dist");
  app.use(express.static(dist));
  app.get("/{*splat}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`EnkLaw API listening on http://localhost:${PORT} (model: ${MODEL}, AI ${aiConfigured ? "enabled" : "NOT configured"}, CourtListener ${cl.clConfigured() ? "enabled" : "NOT configured"})`);
});
