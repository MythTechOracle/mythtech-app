# Live Signals App

This repo contains the current MT-07 Live Signals app: a local operator surface where MT-07 governs how wording becomes visible state, metrics, and audit.

## What It Includes

- the front-end board under `src/`
- the local host shell path, launcher flow, and PowerShell entry scripts
- the Node/Express backend under `server/`
- ingest and snapshot scripts under `scripts/`
- SQLite persistence for raw intake, processed incidents, and snapshot bundles

## MT-07 Governing Spine

The current app follows this order:

`text -> normalization -> incident form -> event geography -> cluster incident identity -> category -> escalation -> field authority -> visibility -> recovery/thin-sample honesty -> metrics -> audit`

External feeds never touch the board directly. They pass through connectors, normalization, clustering, scoring, snapshot selection, and route delivery before any operator-facing state is rendered.

## Current Surface Modes

- `live_api`: current backend-governed snapshot path
- `degraded`: curated fallback fixture with a five-row tape for continuity
- `mock`: broader synthetic fixture set for UI and metric testing
- `empty`: explicit no-surface fixture state for honesty and edge-case testing

## Current Backend Capabilities

- basket-driven GDELT-first ingest path with optional ACLED support
- optional curated RSS watch-feed ingest lane, disabled by default until configured
- Event Registry reserved as a later shadow-discovery lane and not yet implemented
- draft MT-07 result-envelope sidecar export for helper/handoff use
- SQLite-backed persistence
- incident-aware normalization with source-family logic, translation-aware comparison text, and event-geometry separation
- weighted clustering with cross-category incident merging where incident identity is strong
- field relevance, thin-sample honesty, and provisional surface recovery
- Escalation Pressure metric with explain surface and temporal read
- event-geometry alias handling and phrase-aware target/origin resolution

## Local API Contract

The current front end is matched to:

- `/api/dashboard?window=6h`
- `/api/handoff/mt07-envelope`
- `/api/metrics/history?window=6h&compare=24h,7d`
- `/api/composition?window=6h`
- `/api/events?...`
- `/api/explain/metric/:key`
- `/api/health/cluster-quality?...`
- `/api/health/escalation-pressure?...`

## Claude Code Repo Tools

The project-scoped read-only MCP server in [`.mcp.json`](C:/Users/Neltron/Documents/Playground/.mcp.json) currently exposes:

- `get_dashboard`
  - reads the current dashboard bundle from the local Signal app API
- `get_mt07_envelope`
  - reads the draft MT-07 result-envelope sidecar from the local Signal app API
- `get_explain_metric`
  - reads one explain surface such as `signal_velocity`, `volatility_index`, `escalation_pressure`, `correction_rate`, or `tone_pressure`
- `get_health_report`
  - reads one app health route such as cluster quality, escalation pressure, ACLED proof, or lane compare
- `get_snapshot_selection`
  - reads the current live-vs-fallback snapshot selection directly from SQLite
- `get_snapshot_bundle`
  - reads the latest selected, latest overall, or latest live snapshot bundle directly from SQLite
- `get_db_overview`
  - reads a narrow database overview for raw items, processed events, and metric snapshots

These tools are read-only by design and are intended for repo-side audit, tracing, and maintenance work.

Claude Code may inspect the field, but it does not decide visibility, scoring, corroboration, or operator-facing truth.

API-backed MCP tools require the local server to be running.
SQLite-backed MCP tools can still inspect recent state directly when the server is down.

## Claude Boundaries

Claude-facing integration in this repo follows a narrow helper-service law.

### Claude Code (current)

Claude Code is limited to read-only repo-side audit, tracing, maintenance support, and explain-surface inspection through the project MCP tools and local codebase access.

It may:

- inspect dashboard, explain, health, snapshot, and database state
- summarize maintenance findings
- assist with repo-side tracing and audit notes
- suggest checkpoints and follow-up checks

It may not:

- write to live board payloads
- decide visibility, scoring, corroboration, or escalation
- modify operator-facing field truth
- autonomously change app code or runtime state

### Claude Agent SDK (planned narrow Phase 1)

If enabled later, the Agent SDK layer will be a TypeScript-first helper service with read-only inputs and advisory-only outputs.

Phase 1 outputs are limited to:

- audit notes
- maintenance summaries
- explain helper text
- checkpoint suggestions

Phase 1 must not:

- publish directly into live board payloads
- act as system-of-record
- claim field-truth authority
- perform autonomous code modification
- rewrite runtime classifications or visibility state

MT-07 remains sovereign over what appears as field truth.

## Quickstart

1. Run `npm install`.
2. Copy `.env.example` to `.env` and set the values you want.
3. Run `npm run db:init`.
4. Run `npm run ingest:once`.
5. Optional: configure `RSS_FEEDS_JSON` and run `npm run ingest:rss:once`.
6. Run `npm run snapshot:once`.
7. Run `npm run start:live`.
8. Point the front end at `/api`.

## Notes

- The app is local-lab oriented but no longer just a scaffold.
- The route layer stays stable by serving one snapshot bundle JSON object with `dashboard`, `history`, and `explain`.
- One instrument for the field; one assistant for the craft.
- MT-07 wording contract checkpoint: [MT07_WORDING_V1_2_CHECKPOINT_2026-03-28.md](./MT07_WORDING_V1_2_CHECKPOINT_2026-03-28.md)
- MT-07 tone layer checkpoint: [MT07_TONE_LAYER_CHECKPOINT_2026-04-02.md](./MT07_TONE_LAYER_CHECKPOINT_2026-04-02.md)
- Claude Code repo-side integration plan: [CLAUDE_CODE_SIGNAL_APP_INTEGRATION_PLAN.md](./CLAUDE_CODE_SIGNAL_APP_INTEGRATION_PLAN.md)
- Claude Agent SDK embed plan: [CLAUDE_AGENT_SDK_SIGNAL_APP_EMBED_PLAN.md](./CLAUDE_AGENT_SDK_SIGNAL_APP_EMBED_PLAN.md)
- Claude Agent SDK Phase 1 repo skeleton: [CLAUDE_AGENT_SDK_PHASE1_REPO_SKELETON.md](./CLAUDE_AGENT_SDK_PHASE1_REPO_SKELETON.md)
- MythTech kernel adaptation plan: [MYTHTECH_KERNEL_TO_SIGNAL_APP_ADAPTATION_PLAN.md](./MYTHTECH_KERNEL_TO_SIGNAL_APP_ADAPTATION_PLAN.md)
- MemPalace adaptation plan: [MEMPALACE_TO_SIGNAL_APP_ADAPTATION_PLAN.md](./MEMPALACE_TO_SIGNAL_APP_ADAPTATION_PLAN.md)
- RSS and Event Registry fit plan: [RSS_AND_EVENT_REGISTRY_FIT_PLAN.md](./RSS_AND_EVENT_REGISTRY_FIT_PLAN.md)
- Negotiation geometry matrix fit plan: [NEGOTIATION_GEOMETRY_MATRIX_FIT_PLAN.md](./NEGOTIATION_GEOMETRY_MATRIX_FIT_PLAN.md)

## Doctrine Seal

The Live Signals app is the operator surface.
External feeds do not author the board.
Helpers may inspect and assist, but MT-07 governs what becomes visible field state, metric meaning, and audit truth.
