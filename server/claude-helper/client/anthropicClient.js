import { query } from "@anthropic-ai/claude-agent-sdk";
import { buildReadOnlyQueryOptions } from "../guardrails/readOnlyPolicy.js";

export async function runStructuredClaudeHelperQuery({ prompt, schema, env = process.env }) {
  let resultMessage = null;

  for await (const message of query({
    prompt,
    options: buildReadOnlyQueryOptions({ schema, env })
  })) {
    if (message.type === "result") {
      resultMessage = message;
    }
  }

  if (!resultMessage) {
    throw new Error("Claude helper returned no final result message.");
  }

  if (resultMessage.subtype !== "success" || !resultMessage.structured_output) {
    const errorText =
      resultMessage.subtype === "error_max_structured_output_retries"
        ? "Claude helper could not satisfy the structured output contract."
        : resultMessage.errors?.join("; ") || resultMessage.result || "Claude helper request failed.";
    throw new Error(errorText);
  }

  return {
    structured_output: resultMessage.structured_output,
    meta: {
      total_cost_usd: resultMessage.total_cost_usd ?? null,
      num_turns: resultMessage.num_turns ?? null,
      stop_reason: resultMessage.stop_reason ?? null,
      model_usage: resultMessage.modelUsage || {}
    }
  };
}
