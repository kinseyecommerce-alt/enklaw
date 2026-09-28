import type Anthropic from "@anthropic-ai/sdk";
import * as cl from "./courtlistener.ts";

// Client-side tools that let Claude research real case law on CourtListener.
export const CASE_LAW_TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_case_law",
    description:
      "Search U.S. court opinions on CourtListener. Use it to find real cases that support or undercut a legal point before citing them. Returns case names, citations, courts, dates, snippets and links.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: 'Keywords or a boolean query, e.g. "implied warranty of habitability" AND "rent withholding".',
        },
        court: {
          type: "string",
          description: "Optional space-separated CourtListener court IDs to limit results, e.g. 'cal calctapp' or 'ca9 cand'.",
        },
        filed_after: { type: "string", description: "Optional YYYY-MM-DD lower bound on the decision date." },
      },
      required: ["query"],
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
  {
    name: "verify_citations",
    description:
      "Check case-law citations (e.g. '576 U.S. 644') against CourtListener's database to confirm they exist and see which case each points to. Use it on any citation before giving it to the user.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text containing one or more case citations." },
      },
      required: ["text"],
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
];

const errorResult = (id: string, message: string): Anthropic.Beta.BetaToolResultBlockParam => ({
  type: "tool_result",
  tool_use_id: id,
  is_error: true,
  content: message,
});

/** Runs one tool call. Inputs are validated here because eager input streaming skips server-side validation. */
export async function runCaseLawTool(call: Anthropic.Beta.BetaToolUseBlock): Promise<Anthropic.Beta.BetaToolResultBlockParam> {
  const input = (call.input ?? {}) as Record<string, unknown>;
  try {
    if (call.name === "search_case_law") {
      if (typeof input.query !== "string" || !input.query.trim()) return errorResult(call.id, "INVALID_INPUT: 'query' must be a non-empty string.");
      const page = await cl.searchOpinions({
        q: input.query,
        court: typeof input.court === "string" ? input.court : undefined,
        filedAfter: typeof input.filed_after === "string" ? input.filed_after : undefined,
      });
      const results = page.results.slice(0, 8).map((r) => ({
        case_name: r.caseName,
        citations: r.citations,
        court: r.court,
        date_filed: r.dateFiled,
        cited_by: r.citeCount,
        status: r.status,
        snippet: r.snippet,
        url: r.url,
      }));
      return { type: "tool_result", tool_use_id: call.id, content: JSON.stringify({ total_matches: page.count, results }) };
    }
    if (call.name === "verify_citations") {
      if (typeof input.text !== "string" || !input.text.trim()) return errorResult(call.id, "INVALID_INPUT: 'text' must be a non-empty string.");
      const checks = await cl.checkCitations(input.text);
      const content = checks.map((c) => ({
        citation: c.citation,
        result: c.verdict,
        normalized: c.normalized,
        matches: c.matches.slice(0, 3),
        message: c.message,
      }));
      return { type: "tool_result", tool_use_id: call.id, content: JSON.stringify(content.length ? content : "No case citations were found in the text.") };
    }
    return errorResult(call.id, `Unknown tool ${call.name}`);
  } catch (e) {
    return errorResult(call.id, e instanceof Error ? e.message : String(e));
  }
}
