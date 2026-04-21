import { Router } from "express";
import { runHelperAudit } from "../../claude-helper/service/runAudit.js";
import {
  ClaudeHelperUnavailableError,
  getClaudeHelperStatus
} from "../../claude-helper/guardrails/readOnlyPolicy.js";
import { getAllowedAuditScopes } from "../../claude-helper/guardrails/inputScope.js";

const router = Router();

router.get("/", (_req, res) => {
  const status = getClaudeHelperStatus(process.env);

  res.json({
    ok: true,
    service: "claude_helper_audit",
    status: status.available ? "available" : "unavailable",
    enabled: status.enabled,
    has_api_key: status.has_api_key,
    model: status.model,
    effort: status.effort,
    max_turns: status.max_turns,
    advisory_only: true,
    operator_review_required: true,
    allowed_input_scope: getAllowedAuditScopes(),
    notes: [
      "Phase 1 helper lane stays read-only and advisory-only.",
      "This route does not publish into /api/dashboard or any MT-07 truth path."
    ]
  });
});

router.post("/", async (req, res) => {
  try {
    const result = await runHelperAudit({
      window: req.body?.window,
      include: req.body?.include,
      focus: req.body?.focus,
      env: process.env
    });

    res.json(result);
  } catch (error) {
    if (error instanceof ClaudeHelperUnavailableError) {
      res.status(503).json({
        ok: false,
        code: error.code,
        message: error.message,
        details: error.details
      });
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    const statusCode =
      message.startsWith("Unsupported audit input scope") ||
      message.includes("Audit include list may not exceed") ||
      message.includes("Audit focus must stay under")
        ? 400
        : 500;

    res.status(statusCode).json({
      ok: false,
      code: statusCode === 400 ? "invalid_helper_request" : "claude_helper_error",
      message:
        statusCode === 400
          ? message
          : "Claude helper audit failed before it could return an advisory note.",
      details: statusCode === 400 ? undefined : { error: message }
    });
  }
});

export default router;
