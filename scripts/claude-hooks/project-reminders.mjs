import path from "node:path";

function readStdin() {
  return new Promise((resolve, reject) => {
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => {
      resolve(input.trim());
    });
    process.stdin.on("error", reject);
  });
}

function emitJson(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function buildSessionContext() {
  return {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext:
        "Project reminder: MT-07 remains the field-reading instrument. Claude Code stays repo-side as a build, audit, trace, and discipline assistant. Prefer app-native read-only surfaces and keep any Claude-side help outside live board authority."
    }
  };
}

function buildPromptContext(prompt) {
  const lowered = String(prompt || "").toLowerCase();
  const shouldAugment =
    /(mt-0[78]|tree of relief|tone layer|checkpoint|claude code|mcp|loom)/i.test(lowered);

  if (!shouldAugment) {
    return null;
  }

  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext:
        "Repo-local context: keep MT-07 sovereign over field law; use Claude Code only as a repo-side helper. When changes touch scoring, normalization, fixtures, tone, Tree of Relief, or checkpoints, check the paired explain surfaces and repo notes before calling the work complete."
    }
  };
}

function buildPostToolContext(filePath) {
  const basename = path.basename(String(filePath || ""));
  let reminder = "";

  if (basename === "scoringService.js") {
    reminder =
      "Reminder: scoring changes usually need an explain-surface check, fixture alignment, and sometimes a checkpoint note.";
  } else if (basename === "normalizationService.js" || basename === "clusteringService.js") {
    reminder =
      "Reminder: normalization or clustering changes can ripple into event geography, tone posture, and scoring assumptions; check downstream explain surfaces.";
  } else if (basename === "fixtures.js") {
    reminder =
      "Reminder: keep mock, degraded, and empty distinct, and mirror any new dashboard or explain fields across fixtures.";
  } else if (basename === "adapter.js" || basename === "LiveSignalsBoard.js") {
    reminder =
      "Reminder: UI-facing changes should stay aligned with snapshot payload shape, explain wording, and MT-07 board restraint.";
  } else if (basename === "README.md" || /CHECKPOINT/i.test(basename) || basename === "CLAUDE_CODE_SIGNAL_APP_INTEGRATION_PLAN.md") {
    reminder =
      "Reminder: docs and checkpoint notes work best when they stay linked from the repo root and match the current app language.";
  } else if (basename === ".mcp.json" || basename === "settings.json") {
    reminder =
      "Reminder: Claude Code config should stay read-only first, warn-first, and outside live board authority.";
  }

  if (!reminder) {
    return null;
  }

  return {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: reminder
    }
  };
}

async function main() {
  const raw = await readStdin();
  if (!raw) {
    process.exit(0);
  }

  const payload = JSON.parse(raw);
  const eventName = payload.hook_event_name;

  if (eventName === "SessionStart") {
    emitJson(buildSessionContext());
    return;
  }

  if (eventName === "UserPromptSubmit") {
    const result = buildPromptContext(payload.prompt);
    if (result) emitJson(result);
    return;
  }

  if (eventName === "PostToolUse") {
    const filePath = payload.tool_input?.file_path || payload.tool_response?.filePath;
    const result = buildPostToolContext(filePath);
    if (result) emitJson(result);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
