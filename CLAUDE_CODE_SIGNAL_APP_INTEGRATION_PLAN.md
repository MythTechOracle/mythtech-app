# Claude Code Signal App Integration Plan

Date: 2026-04-02

## Status

This plan describes the clean role for Claude Code around the MT-07 Live Signals app.

The governing split is:

- `MT-07 / Live Signals app` = the field-reading instrument
- `Claude Code` = the build, audit, trace, and repo-discipline assistant

Claude Code should help tend the Loom.
It should not become the Loom.

## Governing Law

Let Claude Code help tend the Loom; do not let it become the Loom.

Companion line:

Use Claude Code around the Signal app, not inside the MT-07 runtime.

## Why This Fits

Claude Code is strongest as:

- a repo-side engineering assistant
- a debugging and audit surface
- a tool-integrated maintenance layer
- a checkpoint and documentation helper

It is not the right first home for:

- live event truth
- tape gating
- field relevance
- scoring doctrine
- operator-facing runtime authority

That separation keeps the MT-07 board lawful while still making good use of Claude Code's tooling strengths.

## Official Configuration Shape

Current Anthropic documentation supports this split:

- shared project settings and hooks live in `.claude/settings.json`
- shared project MCP servers live in `.mcp.json`
- local per-repo personal overrides live in `.claude/settings.local.json`

This matters because:

- team guardrails and hooks belong in shared project settings
- team-shared tools belong in project-scoped MCP
- personal experiments and local credentials should stay out of git

## Recommended Use Cases

Claude Code is a good fit for:

- tracing ingest failures
- inspecting snapshot bundle changes
- reading `/api/dashboard`, `/api/explain/metric/:key`, and `/api/health/*`
- checking whether scoring changes were matched by explain-surface updates
- reading snapshot JSON and SQLite state through read-only tools
- generating checkpoint notes, cleanup plans, and patch proposals
- validating fixture/live-mode consistency

It is especially well suited to:

- MT-07 checkpoint work
- explain-surface regression checks
- field-law consistency reviews
- repo hygiene and disciplined follow-through after code edits

## Recommended MCP Servers

The first pass should stay read-first and app-native.

Recommended project-scoped MCP surfaces:

1. `signal-dashboard`
   - read-only wrapper for `/api/dashboard?window=6h`
   - optionally allow `24h` and `72h` windows

2. `signal-explain`
   - read-only wrapper for `/api/explain/metric/:key`
   - useful for `signal_velocity`, `volatility_index`, `escalation_pressure`, `correction_rate`, `tone_pressure`

3. `signal-health`
   - read-only wrapper for `/api/health/*`
   - especially:
     - `/api/health/cluster-quality`
     - `/api/health/escalation-pressure`
     - `/api/health/acled-proof`

4. `signal-snapshots`
   - read-only file/resource access to stored snapshot JSON outputs
   - useful for before/after comparison without calling the live server every time

5. `signal-sqlite-ro`
   - read-only SQLite query access
   - tightly scoped to inspection tables and curated queries

The v1 rule should be:

- read-only MCP by default
- no write-capable MCP tools until the review loop proves useful

## Hook Guardrails

Project-shared hooks in `.claude/settings.json` are a good fit for this repo.

Good first hook ideas:

1. `PreToolUse`
   - warn or block risky shell commands
   - deny reads of `.env` and similar secrets
   - gate writes outside approved repo paths if needed

2. `PostToolUse`
   - after scoring-service edits, remind the agent to check explain surfaces
   - after fixture edits, remind the agent to compare mock/degraded/empty behavior
   - after note/checkpoint edits, remind the agent to link them from `README.md` when appropriate

3. `FileChanged`
   - detect edits to:
     - `server/services/scoringService.js`
     - `server/services/normalizationService.js`
     - `src/live-signals/fixtures.js`
   - add contextual reminders about paired files that often need updates

4. `SessionEnd`
   - run a light summary or stale-checkpoint reminder
   - useful for “did this touch doctrine without a note?” style prompts

5. `UserPromptSubmit`
   - add repo-local context when requests mention:
     - MT-07
     - Tree of Relief
     - tone layer
     - checkpoint

These hooks should bias toward reminders and audit context, not hard enforcement, at least in the first pass.

## What Must Stay Outside The Live Board

Claude Code should **not**:

- decide visibility
- alter field authority
- count as a corroborating source
- modify source-family counts
- become part of tape ranking
- rewrite scoring doctrine on its own
- appear as another operator panel inside the live board

This is the key boundary:

- MT-07 remains the instrument of field law
- Claude Code remains a governed engineering assistant

## Recommended First Implementation Shape

Do this in small steps:

### Phase 1

Documentation and discipline only.

- create this plan
- agree on the MCP/tool boundary
- decide which repo checks are worth automating

### Phase 2

Read-only project MCP.

- add `.mcp.json`
- expose read-only app surfaces
- keep SQLite read-only and narrow

### Phase 3

Shared project hooks.

- add `.claude/settings.json`
- start with reminder-oriented hooks
- avoid aggressive blocking on day one

### Phase 4

Optional deeper integration.

- if the workflow proves useful, consider a small repo-side helper service
- if needed later, the Claude Agent SDK can be used as “Claude Code as a library”
- do not jump to this unless the lighter project-scoped path is clearly paying off

## Future Candidate Files

Likely future additions:

- `.mcp.json`
- `.claude/settings.json`
- `.claude/settings.local.json` as a local-only override path
- `scripts/claude-hooks/` for repo-specific hook handlers
- `scripts/mcp/` for read-only Signal app MCP wrappers

These do **not** need to be added yet for this planning pass.

## Checkpoint Verdict

PASS

Why:

- Claude Code can clearly help this repo
- the clean role is around-the-board, not inside-the-board
- official Anthropic configuration supports the team/project split cleanly
- the plan keeps MT-07 sovereign over the live field

## Anchor

One instrument for the field; one assistant for the craft.
