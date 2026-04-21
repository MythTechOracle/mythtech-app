import { readDashboardAuditContext } from "../readers/dashboardReader.js";
import { readHealthAuditContext } from "../readers/healthReader.js";
import {
  readSnapshotSelectionAuditContext,
  readSnapshotBundleAuditContext
} from "../readers/snapshotReader.js";
import { readMt07EnvelopeAuditContext } from "../readers/mt07EnvelopeReader.js";
import { buildAuditPrompt } from "../prompts/auditPrompt.js";
import { auditOutputSchema, normalizeAuditOutput } from "../types/helperContracts.js";
import { runStructuredClaudeHelperQuery } from "../client/anthropicClient.js";
import { getClaudeHelperStatus } from "../guardrails/readOnlyPolicy.js";
import {
  normalizeAuditFocus,
  normalizeAuditIncludeScopes,
  normalizeAuditWindow
} from "../guardrails/inputScope.js";

const AUDIT_READERS = {
  dashboard: () => readDashboardAuditContext(),
  health: () => readHealthAuditContext(),
  snapshot_selection: () => readSnapshotSelectionAuditContext(),
  snapshot_bundle: () => readSnapshotBundleAuditContext(),
  mt07_envelope: () => readMt07EnvelopeAuditContext()
};

const SUPPORTING_PATHS = {
  dashboard: "/api/dashboard",
  health: "/api/health",
  snapshot_selection: "sqlite:metric_snapshots.selection",
  snapshot_bundle: "sqlite:metric_snapshots.selected",
  mt07_envelope: "/api/handoff/mt07-envelope"
};

export async function runHelperAudit({ window, include, focus, env = process.env }) {
  const normalizedWindow = normalizeAuditWindow(window);
  const normalizedFocus = normalizeAuditFocus(focus);
  const inputScope = normalizeAuditIncludeScopes(include);

  const inputs = Object.fromEntries(inputScope.map((scope) => [scope, AUDIT_READERS[scope]()] ));

  const prompt = buildAuditPrompt({
    window: normalizedWindow,
    focus: normalizedFocus,
    inputScope,
    inputs
  });

  const { structured_output, meta } = await runStructuredClaudeHelperQuery({
    prompt,
    schema: auditOutputSchema,
    env
  });

  const helperStatus = getClaudeHelperStatus(env);
  const supportingPaths = inputScope.map((scope) => SUPPORTING_PATHS[scope]).filter(Boolean);

  return {
    ...normalizeAuditOutput(structured_output, {
      inputScope,
      window: normalizedWindow,
      focus: normalizedFocus,
      helperEngine: {
        provider: "anthropic",
        package: "@anthropic-ai/claude-agent-sdk",
        model: helperStatus.model,
        total_cost_usd: meta.total_cost_usd,
        num_turns: meta.num_turns,
        stop_reason: meta.stop_reason
      }
    }),
    supporting_paths: supportingPaths
  };
}
