import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import {
  SYSTEM_PROMPT,
  DRAFT_INSTRUCTIONS,
  ANALYZE_INSTRUCTIONS,
  HEARING_INSTRUCTIONS,
  ORDER_INSTRUCTIONS,
  VERIFY_INSTRUCTIONS,
} from "./prompts.ts";
import * as ik from "./indiankanoon.ts";
import { RESEARCH_TOOLS, runResearchTool } from "./tools.ts";

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
app.use(express.json({ limit: "25mb" }));

// The Android / iOS apps load from capacitor://localhost or https://localhost and call this
// server cross-origin. Allow those origins (and any listed in ENKLAW_ALLOWED_ORIGINS).
const ALLOWED_ORIGINS = new Set([
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
  ...(process.env.ENKLAW_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
]);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// When the server is reachable from the internet, set ENKLAW_ACCESS_TOKEN so only your apps can
// spend your Anthropic / Indian Kanoon credit. The apps send it as "Authorization: Bearer <token>".
const ACCESS_TOKEN = process.env.ENKLAW_ACCESS_TOKEN?.trim() ?? "";
app.use("/api", (req, res, next) => {
  if (!ACCESS_TOKEN || req.path === "/health") return next();
  if (req.headers.authorization === `Bearer ${ACCESS_TOKEN}`) return next();
  res.status(401).json({ error: "Wrong or missing access code. Enter the server's access code in Settings." });
});

app.get("/api/health", (req, res) => {
  const authOk = !ACCESS_TOKEN || req.headers.authorization === `Bearer ${ACCESS_TOKEN}`;
  res.json({ ok: true, authOk, aiConfigured: authOk && aiConfigured, model: MODEL, indianKanoon: authOk && ik.ikConfigured() });
});

const COMMON = {
  model: MODEL,
  thinking: { type: "adaptive" as const },
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default" as const,
  system: [{ type: "text" as const, text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } }],
};

/**
 * Streams Claude's text output to the HTTP response as plain text.
 * Runs the tool loop for the Indian Kanoon tools, continues `pause_turn`
 * (server-side web search hitting its iteration limit), and surfaces
 * refusals instead of returning silence.
 */
async function streamToResponse(
  res: express.Response,
  opts: { messages: Anthropic.Beta.BetaMessageParam[]; webSearch?: boolean; research?: boolean },
) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  const messages = [...opts.messages];
  const tools: Anthropic.Beta.BetaToolUnion[] = [];
  if (opts.research && ik.ikConfigured()) tools.push(...RESEARCH_TOOLS);
  if (opts.webSearch) tools.push({ type: "web_search_20260209", name: "web_search", max_uses: 5 });

  try {
    for (let turn = 0; turn < 15; turn++) {
      const stream = client.beta.messages.stream({
        ...COMMON,
        max_tokens: 64000,
        output_config: { effort: "high" },
        tools: tools.length ? tools : undefined,
        messages,
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          res.write(event.delta.text);
        } else if (event.type === "content_block_start" && event.content_block.type === "server_tool_use") {
          res.write("\n\n_🔎 Searching the web…_\n\n");
        } else if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
          res.write(`\n\n_⚖️ ${event.content_block.name === "read_judgment" ? "Reading judgment" : "Searching Indian Kanoon"}…_\n\n`);
        }
      }

      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") {
        res.write("\n\n[The assistant declined to answer this request. Try rephrasing it.]");
        break;
      }
      if (final.stop_reason === "tool_use") {
        const calls = final.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
        const results = await Promise.all(calls.map((call) => runResearchTool(call)));
        messages.push({ role: "assistant", content: final.content }, { role: "user", content: results });
        continue;
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

const withCase = (caseContext: string | undefined, text: string) =>
  caseContext ? `<case_file>\n${caseContext}\n</case_file>\n\n${text}` : text;

function requireAi(res: express.Response): boolean {
  if (aiConfigured) return true;
  res.status(503).type("text/plain").send("AI is not configured. Set ANTHROPIC_API_KEY in your .env file and restart the server.");
  return false;
}

/** A PDF / image / text upload, sent by the browser as base64 or text. */
type Upload = { title?: string; text?: string; base64?: string; mediaType?: string };

function uploadBlocks(u: Upload): Anthropic.Beta.BetaContentBlockParam[] | null {
  const title = (u.title || "document").replace(/"/g, "'");
  if (u.base64 && u.mediaType === "application/pdf")
    return [{ type: "document", title, source: { type: "base64", media_type: "application/pdf", data: u.base64 } }];
  if (u.base64 && /^image\/(png|jpeg|gif|webp)$/.test(u.mediaType ?? ""))
    return [{ type: "image", source: { type: "base64", media_type: u.mediaType as "image/png", data: u.base64 } }];
  if (u.text) return [{ type: "text", text: `<document title="${title}">\n${u.text}\n</document>` }];
  return null;
}

app.post("/api/chat", async (req, res) => {
  if (!requireAi(res)) return;
  const body = req.body as { caseContext?: string; messages: Anthropic.Beta.BetaMessageParam[]; webSearch?: boolean; research?: boolean };
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    res.status(400).send("messages is required");
    return;
  }
  // Attach the case file to the first user turn so it stays in a stable, cacheable prefix.
  const [first, ...rest] = body.messages;
  const firstText = typeof first.content === "string" ? first.content : "";
  await streamToResponse(res, {
    messages: [{ role: "user", content: withCase(body.caseContext, firstText) }, ...rest],
    webSearch: body.webSearch,
    research: body.research,
  });
});

app.post("/api/draft", async (req, res) => {
  if (!requireAi(res)) return;
  const { caseContext, docType, instructions, research } = req.body as {
    caseContext?: string;
    docType: string;
    instructions?: string;
    research?: boolean;
  };
  const extra =
    research && ik.ikConfigured()
      ? "\n\nUse the Indian Kanoon tools to find real supporting judgments before citing any, and confirm each one. Do not narrate the research; output only the document and checklist."
      : "";
  const prompt = `${DRAFT_INSTRUCTIONS}${extra}\n\nDocument type: ${docType}\n\nWhat the document must do / key facts:\n${instructions || "(no extra instructions)"}`;
  await streamToResponse(res, { messages: [{ role: "user", content: withCase(caseContext, prompt) }], research });
});

app.post("/api/verify-citations", async (req, res) => {
  if (!requireAi(res)) return;
  if (!ik.ikConfigured()) {
    res.status(503).type("text/plain").send("Set INDIANKANOON_API_TOKEN in .env to verify citations.");
    return;
  }
  const { text } = req.body as { text?: string };
  if (!text?.trim()) {
    res.status(400).send("text is required");
    return;
  }
  await streamToResponse(res, { messages: [{ role: "user", content: `${VERIFY_INSTRUCTIONS}\n\n<document>\n${text}\n</document>` }], research: true });
});

app.post("/api/analyze", async (req, res) => {
  if (!requireAi(res)) return;
  const { caseContext, ...upload } = req.body as Upload & { caseContext?: string };
  const blocks = uploadBlocks(upload);
  if (!blocks) {
    res.status(400).send("Upload a PDF, an image, or paste text.");
    return;
  }
  await streamToResponse(res, {
    messages: [{ role: "user", content: [...blocks, { type: "text", text: withCase(caseContext, ANALYZE_INSTRUCTIONS) }] }],
  });
});

app.post("/api/hearing-prep", async (req, res) => {
  if (!requireAi(res)) return;
  const { caseContext, hearing, notes } = req.body as { caseContext?: string; hearing: string; notes?: string };
  const prompt = `${HEARING_INSTRUCTIONS}\n\nHearing: ${hearing}\n\nMy notes / goals:\n${notes || "(none)"}`;
  await streamToResponse(res, { messages: [{ role: "user", content: withCase(caseContext, prompt) }] });
});

const OrderExtract = z.object({
  order_date: z.string().describe("Date of the order, YYYY-MM-DD, or empty"),
  title: z.string().describe("Short title, e.g. 'Notice issued; reply in 4 weeks'"),
  summary: z.string().describe("2-5 sentence plain-language summary of what the court did"),
  outcome: z.string().describe("One line for the case diary: what happened at this hearing"),
  judge: z.string().describe("Judge(s) / bench named in the order, or empty"),
  next_date: z.string().describe("Next date of hearing, YYYY-MM-DD, or empty if not fixed"),
  next_date_note: z.string().describe("How the next date was determined, or empty"),
  next_purpose: z.string().describe("Purpose of the next listing, e.g. 'Arguments', or empty"),
  disposed: z.boolean().describe("True if the order finally disposes of the case"),
  compliances: z
    .array(z.object({ task: z.string(), due_date: z.string().describe("YYYY-MM-DD or empty") }))
    .describe("Directions someone must comply with, with deadlines if stated"),
});

app.post("/api/read-order", async (req, res) => {
  if (!requireAi(res)) return;
  const { caseContext, ...upload } = req.body as Upload & { caseContext?: string };
  const blocks = uploadBlocks(upload);
  if (!blocks) {
    res.status(400).json({ error: "Upload a PDF, an image, or paste the order text." });
    return;
  }
  try {
    const msg = await client.beta.messages.parse({
      ...COMMON,
      max_tokens: 8000,
      output_config: { effort: "medium", format: betaZodOutputFormat(OrderExtract) },
      messages: [{ role: "user", content: [...blocks, { type: "text", text: withCase(caseContext, ORDER_INSTRUCTIONS) }] }],
    });
    if (msg.stop_reason === "refusal" || !msg.parsed_output) {
      res.status(422).json({ error: "Could not read this order. Try a clearer scan or paste the text." });
      return;
    }
    res.json(msg.parsed_output);
  } catch (e) {
    res.status(502).json({ error: describeError(e) });
  }
});

// ---------- Indian Kanoon proxy ----------

app.get("/api/ik/search", async (req, res) => {
  if (!ik.ikConfigured()) {
    res.status(503).json({ error: "Indian Kanoon is not configured. Set INDIANKANOON_API_TOKEN in your .env file and restart the server." });
    return;
  }
  const s = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  try {
    res.json(
      await ik.search({
        q: s(req.query.q) ?? "",
        doctype: s(req.query.court),
        fromDate: s(req.query.from),
        toDate: s(req.query.to),
        sortBy: s(req.query.sort) as ik.SearchParams["sortBy"],
        page: Number(req.query.page ?? 0) || 0,
      }),
    );
  } catch (e) {
    const status = e instanceof ik.IKError ? e.status : 502;
    res.status(status >= 400 && status < 600 ? status : 502).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.get("/api/ik/courts", (_req, res) => res.json(ik.DOCTYPES));

if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(here, "../dist");
  app.use(express.static(dist));
  app.get("/{*splat}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => {
  console.log(
    `EnkLaw API on http://localhost:${PORT} (model: ${MODEL}, AI ${aiConfigured ? "enabled" : "NOT configured"}, Indian Kanoon ${ik.ikConfigured() ? "enabled" : "NOT configured"})`,
  );
});
