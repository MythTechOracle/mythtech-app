import path from "node:path";

export const DISALLOWED_CLAUDE_HELPER_TOOLS = [
  "Agent",
  "AskUserQuestion",
  "Bash",
  "Config",
  "Edit",
  "EnterWorktree",
  "ExitPlanMode",
  "Glob",
  "Grep",
  "ListMcpResources",
  "NotebookEdit",
  "Read",
  "ReadMcpResource",
  "TaskStop",
  "TodoWrite",
  "WebFetch",
  "WebSearch",
  "Write"
];

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return String(value).toLowerCase() === "true";
}

function toPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export class ClaudeHelperUnavailableError extends Error {
  constructor(message, details) {
    super(message);
    this.name = "ClaudeHelperUnavailableError";
    this.code = "claude_helper_unavailable";
    this.details = details;
  }
}

export function getClaudeHelperStatus(env = process.env) {
  const enabled = parseBoolean(env.CLAUDE_HELPER_ENABLED, false);
  const hasApiKey = Boolean(String(env.ANTHROPIC_API_KEY || "").trim());
  const model = String(env.CLAUDE_HELPER_MODEL || "sonnet").trim() || "sonnet";
  const effort = String(env.CLAUDE_HELPER_EFFORT || "medium").trim() || "medium";
  const maxTurns = toPositiveInteger(env.CLAUDE_HELPER_MAX_TURNS, 1);
  const cwd = path.resolve(String(env.CLAUDE_HELPER_CWD || process.cwd()).trim() || process.cwd());
  const clientApp =
    String(env.CLAUDE_AGENT_SDK_CLIENT_APP || "live-signals-app-helper").trim() ||
    "live-signals-app-helper";

  return {
    enabled,
    has_api_key: hasApiKey,
    available: enabled && hasApiKey,
    model,
    effort,
    max_turns: maxTurns,
    cwd,
    client_app: clientApp
  };
}

export function assertClaudeHelperAvailable(env = process.env) {
  const status = getClaudeHelperStatus(env);
  if (!status.enabled || !status.has_api_key) {
    throw new ClaudeHelperUnavailableError(
      "Claude helper audit is unavailable. Set CLAUDE_HELPER_ENABLED=true and provide ANTHROPIC_API_KEY to activate the embedded helper lane.",
      status
    );
  }
  return status;
}

export async function denyAllToolUse(toolName) {
  return {
    behavior: "deny",
    message: `Phase 1 helper lane is advisory-only. Tool access is disabled for ${toolName}.`
  };
}

export function buildReadOnlyQueryOptions({ schema, env = process.env }) {
  const status = assertClaudeHelperAvailable(env);

  return {
    cwd: status.cwd,
    env: {
      ...env,
      CLAUDE_AGENT_SDK_CLIENT_APP: status.client_app
    },
    model: status.model,
    effort: status.effort,
    allowedTools: [],
    permissionMode: "dontAsk",
    maxTurns: status.max_turns,
    disallowedTools: DISALLOWED_CLAUDE_HELPER_TOOLS,
    canUseTool: denyAllToolUse,
    outputFormat: {
      type: "json_schema",
      schema
    }
  };
}
