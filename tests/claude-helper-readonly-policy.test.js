import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReadOnlyQueryOptions,
  DISALLOWED_CLAUDE_HELPER_TOOLS
} from "../server/claude-helper/guardrails/readOnlyPolicy.js";

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["summary"],
  properties: {
    summary: { type: "string" }
  }
};

test("helper lane query options enforce zero allowed tools", async () => {
  const options = buildReadOnlyQueryOptions({
    schema,
    env: {
      CLAUDE_HELPER_ENABLED: "true",
      ANTHROPIC_API_KEY: "test-key",
      CLAUDE_HELPER_CWD: "."
    }
  });

  assert.deepEqual(options.allowedTools, []);
  assert.equal(options.permissionMode, "dontAsk");
  assert.ok(Array.isArray(options.disallowedTools));
  assert.ok(options.disallowedTools.includes("Write"));
  assert.ok(options.disallowedTools.includes("Bash"));
  assert.ok(DISALLOWED_CLAUDE_HELPER_TOOLS.includes("Write"));

  const toolDecision = await options.canUseTool("Write");
  assert.equal(toolDecision.behavior, "deny");
});

test("helper lane query options reject unavailable helper status", () => {
  assert.throws(
    () =>
      buildReadOnlyQueryOptions({
        schema,
        env: {
          CLAUDE_HELPER_ENABLED: "false",
          ANTHROPIC_API_KEY: ""
        }
      }),
    /unavailable/i
  );
});
