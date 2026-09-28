import type Anthropic from "@anthropic-ai/sdk";
import * as ik from "./indiankanoon.ts";

// Client-side tools that let Claude research real Indian judgments on Indian Kanoon.
export const RESEARCH_TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_judgments",
    description:
      "Search Indian judgments (Supreme Court, High Courts, tribunals) and Central Acts on Indian Kanoon. Use it to find real precedents before citing any case. Supports phrases in quotes and ANDD / ORR / NOTT operators. Returns titles, court, date, times cited, a snippet and a doc_id.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: 'e.g. "anticipatory bail" ANDD "section 482 BNSS"' },
        court: {
          type: "string",
          description: `Optional court filter. One of: ${Object.keys(ik.DOCTYPES).join(", ")}.`,
        },
        from_date: { type: "string", description: "Optional YYYY-MM-DD lower bound on the judgment date." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
  {
    name: "read_judgment",
    description:
      "Read the paragraphs of a specific judgment (by doc_id from search_judgments) that match a query — use it to confirm what the judgment actually held before relying on it.",
    input_schema: {
      type: "object",
      properties: {
        doc_id: { type: "integer", description: "Indian Kanoon doc_id" },
        query: { type: "string", description: "Words to find in the judgment, e.g. the legal point" },
      },
      required: ["doc_id", "query"],
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
];

const err = (id: string, message: string): Anthropic.Beta.BetaToolResultBlockParam => ({ type: "tool_result", tool_use_id: id, is_error: true, content: message });

/** Runs one tool call. Inputs are validated here because eager input streaming skips server-side validation. */
export async function runResearchTool(call: Anthropic.Beta.BetaToolUseBlock): Promise<Anthropic.Beta.BetaToolResultBlockParam> {
  const input = (call.input ?? {}) as Record<string, unknown>;
  try {
    if (call.name === "search_judgments") {
      if (typeof input.query !== "string" || !input.query.trim()) return err(call.id, "INVALID_INPUT: 'query' must be a non-empty string.");
      const r = await ik.search({
        q: input.query,
        doctype: typeof input.court === "string" ? input.court : undefined,
        fromDate: typeof input.from_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.from_date) ? input.from_date : undefined,
      });
      const results = r.results.slice(0, 8).map((j) => ({ doc_id: j.id, title: j.title, court: j.court, date: j.date, cited_by: j.citedBy, snippet: j.headline, url: j.url }));
      return { type: "tool_result", tool_use_id: call.id, content: JSON.stringify({ found: r.found, results }) };
    }
    if (call.name === "read_judgment") {
      const id = Number(input.doc_id);
      if (!Number.isInteger(id) || id <= 0) return err(call.id, "INVALID_INPUT: 'doc_id' must be a positive integer.");
      if (typeof input.query !== "string" || !input.query.trim()) return err(call.id, "INVALID_INPUT: 'query' must be a non-empty string.");
      return { type: "tool_result", tool_use_id: call.id, content: JSON.stringify(await ik.fragment(id, input.query)) };
    }
    return err(call.id, `Unknown tool ${call.name}`);
  } catch (e) {
    return err(call.id, e instanceof Error ? e.message : String(e));
  }
}
