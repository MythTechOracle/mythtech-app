# Claude Agent SDK Phase 1 Repo Skeleton

Date: 2026-04-03

## Status

This document translates the Phase 1 embed plan into a concrete repo skeleton.

It answers:

- where the helper lane should live
- what routes it should expose
- what TypeScript files it should use
- what request/response shapes it should follow
- how read-only enforcement should be kept explicit

This is a carrier plan, not an activation note.

No Agent SDK runtime path is active in the current app unless it is explicitly added later.

## Governing Law

Read from the backend edge.
Emit on a separate helper rail.
Render in a subordinate UI lane.
Persist separately, if at all.
Never enter the field-truth path.

Companion line:

Claude may observe, explain, summarize, and suggest.
Claude may not publish, decide, classify, seal, or rewrite the field.

## Placement

Phase 1 should sit beside the field pipeline, not inside it.

That means:

- **not** in normalization
- **not** in clustering
- **not** in scoring
- **not** in escalation pressure
- **not** in field authority
- **not** in visibility selection
- **not** in snapshot authoring
- **not** in operator-facing truth routes

The helper lane belongs after the snapshot and route layer, as a read-only advisory branch.

## Proposed Repo Skeleton

```text
server/
  claude-helper/
    client/
      anthropicClient.ts
    readers/
      dashboardReader.ts
      explainReader.ts
      healthReader.ts
      snapshotReader.ts
      dbOverviewReader.ts
    prompts/
      auditPrompt.ts
      maintenanceSummaryPrompt.ts
      explainAssistPrompt.ts
      checkpointSuggestPrompt.ts
    service/
      runAudit.ts
      runMaintenanceSummary.ts
      runExplainAssist.ts
      runCheckpointSuggest.ts
    types/
      helperTypes.ts
      helperContracts.ts
    guardrails/
      readOnlyPolicy.ts
      inputScope.ts
  routes/
    helper/
      audit.ts
      maintenanceSummary.ts
      explainAssist.ts
      checkpointSuggest.ts

src/
  modules/
    helper/
      helperApi.ts
      HelperDrawer.tsx
      HelperPanel.tsx
      helperTypes.ts

scripts/
  helper/
    run-audit.ts
    run-maintenance-summary.ts
    run-explain-assist.ts
    run-checkpoint-suggest.ts
```

## Folder Roles

### `server/claude-helper/client/`

Anthropic SDK wrapper only.

Responsibilities:

- initialize the Claude Agent SDK client
- keep provider config isolated
- expose a narrow helper call interface

Should not:

- know anything about MT-07 scoring internals
- read files directly
- decide what data is allowed

### `server/claude-helper/readers/`

Read-only adapters for approved app surfaces.

Responsibilities:

- fetch or load approved inputs
- normalize them into helper-safe shapes
- keep input scope explicit

Approved readers:

- `dashboardReader.ts`
- `explainReader.ts`
- `healthReader.ts`
- `snapshotReader.ts`
- `dbOverviewReader.ts`

### `server/claude-helper/prompts/`

Stable prompt builders for Phase 1 helper tasks.

Responsibilities:

- frame the helper’s role
- carry the “advisory only” contract
- keep output shape stable

Prompt files should be task-specific, not generic.

### `server/claude-helper/service/`

Orchestration layer for helper runs.

Responsibilities:

- collect inputs from readers
- call the Anthropic client
- validate output shape
- return structured advisory JSON

This is the main helper lane, but it is still not a field-truth lane.

### `server/claude-helper/types/`

Shared TypeScript contracts and helper result types.

Responsibilities:

- request/response types
- enumerated helper kinds
- input scope declarations
- confidence-note and warning shapes

### `server/claude-helper/guardrails/`

Read-only and scope boundary helpers.

Responsibilities:

- whitelist approved readers
- reject unsupported input scopes
- mark outputs as operator-reviewed only

This is where the “never” list becomes code-level policy.

### `server/routes/helper/`

Separate advisory routes.

Responsibilities:

- accept helper requests
- call the service layer
- return structured helper JSON

These routes must remain parallel to the current app routes, never merged into:

- `/api/dashboard`
- `/api/explain/metric/:key`
- `/api/events`

### `src/modules/helper/`

Optional subordinate UI lane.

Responsibilities:

- render helper results only if explicitly surfaced later
- keep helper output visually distinct from MT-07 board truth

Best placements:

- a helper drawer
- a bottom operator-assist panel
- a shell-adjacent utility pane

Not:

- metric cards
- tape rows
- event details
- Tree of Relief authorship

### `scripts/helper/`

Dry-run and local test scripts.

Responsibilities:

- replay helper runs locally
- test helper outputs against fixtures or recent snapshots
- keep Phase 1 experimentation outside the live pipeline

## Route Names

Recommended Phase 1 helper routes:

- `/api/helper/audit`
- `/api/helper/maintenance-summary`
- `/api/helper/explain-assist`
- `/api/helper/checkpoint-suggest`

These route names should remain narrow and task-shaped.

Do not introduce:

- `/api/helper/predict`
- `/api/helper/classify`
- `/api/helper/publish`
- `/api/helper/write`

## Request Contracts

These routes should stay small and explicit.

### `POST /api/helper/audit`

Request:

```json
{
  "window": "6h",
  "include": ["dashboard", "health", "snapshot_selection"],
  "focus": "field_restraint"
}
```

Response:

```json
{
  "kind": "audit_note",
  "input_scope": ["dashboard", "health", "snapshot_selection"],
  "summary": "Thin visible field with strict held-out selection.",
  "observations": [
    "Visible tape remained sparse.",
    "Held-out field carried most of the activity."
  ],
  "warnings": [],
  "suggested_next_checks": [
    "Inspect weak-cluster precheck thresholds.",
    "Compare against the previous 24h window."
  ],
  "confidence_note": "Advisory helper output based on read-only app state.",
  "operator_review_required": true
}
```

### `POST /api/helper/maintenance-summary`

Request:

```json
{
  "scope": ["repo_status", "snapshot_selection", "health"],
  "focus": "maintenance"
}
```

Response kind:

- `maintenance_summary`

### `POST /api/helper/explain-assist`

Request:

```json
{
  "metric_key": "escalation_pressure",
  "window": "6h",
  "focus": "operator_clarity"
}
```

Response kind:

- `explain_helper`

### `POST /api/helper/checkpoint-suggest`

Request:

```json
{
  "topic": "tone_layer",
  "scope": ["dashboard", "explain", "fixtures"],
  "style": "checkpoint_note"
}
```

Response kind:

- `checkpoint_suggestion`

## Shared Response Contract

Every helper route should return the same top-level fields:

```json
{
  "kind": "audit_note",
  "input_scope": ["dashboard"],
  "summary": "Short advisory summary.",
  "observations": [],
  "warnings": [],
  "suggested_next_checks": [],
  "confidence_note": "Advisory helper output based on read-only app state.",
  "operator_review_required": true
}
```

Required fields:

- `kind`
- `input_scope`
- `summary`
- `observations`
- `warnings`
- `suggested_next_checks`
- `confidence_note`
- `operator_review_required`

Optional fields:

- `supporting_paths`
- `supporting_metrics`
- `window`
- `generated_at`

## TypeScript File Names

Suggested core files:

- `server/claude-helper/client/anthropicClient.ts`
- `server/claude-helper/readers/dashboardReader.ts`
- `server/claude-helper/readers/explainReader.ts`
- `server/claude-helper/readers/healthReader.ts`
- `server/claude-helper/readers/snapshotReader.ts`
- `server/claude-helper/readers/dbOverviewReader.ts`
- `server/claude-helper/prompts/auditPrompt.ts`
- `server/claude-helper/prompts/maintenanceSummaryPrompt.ts`
- `server/claude-helper/prompts/explainAssistPrompt.ts`
- `server/claude-helper/prompts/checkpointSuggestPrompt.ts`
- `server/claude-helper/service/runAudit.ts`
- `server/claude-helper/service/runMaintenanceSummary.ts`
- `server/claude-helper/service/runExplainAssist.ts`
- `server/claude-helper/service/runCheckpointSuggest.ts`
- `server/claude-helper/types/helperTypes.ts`
- `server/claude-helper/types/helperContracts.ts`
- `server/claude-helper/guardrails/readOnlyPolicy.ts`
- `server/claude-helper/guardrails/inputScope.ts`
- `server/routes/helper/audit.ts`
- `server/routes/helper/maintenanceSummary.ts`
- `server/routes/helper/explainAssist.ts`
- `server/routes/helper/checkpointSuggest.ts`

## Read-Only Enforcement Notes

Phase 1 should enforce read-only behavior in more than one place.

### 1. Input enforcement

Only allow these readers:

- dashboard
- explain
- health
- snapshot selection
- snapshot bundle
- database overview
- explicit operator prompt

Reject:

- direct write handles
- mutable DB access
- code-edit requests
- live runtime mutation requests

### 2. Output enforcement

All outputs must include:

- `operator_review_required: true`
- an advisory `confidence_note`
- a `kind` limited to the approved Phase 1 output kinds

Disallow output kinds such as:

- `publish`
- `classification`
- `visibility_decision`
- `rewrite_instruction`
- `runtime_patch`

### 3. Route separation

Helper routes must remain outside:

- `/api/dashboard`
- `/api/events`
- `/api/explain/metric/:key`

Do not thread helper output into snapshot payload authoring.

### 4. Persistence separation

If helper persistence is added later, keep it separate.

Suggested tables:

- `helper_runs`
- `helper_notes`
- `helper_checkpoints`

Do not store helper outputs in:

- `metric_snapshots`
- snapshot-selection records
- processed event truth tables

### 5. UI separation

If surfaced later, helper output must remain visually marked as:

- advisory
- operator-reviewed
- non-authoritative

It should never appear styled as if it were:

- tape truth
- metric truth
- method truth

## Minimal Implementation Order

1. add shared TypeScript contracts
2. add read-only readers
3. add the Anthropic client wrapper
4. implement one route first: `/api/helper/audit`
5. validate the response contract against fixture and live snapshot inputs
6. only then add the other helper routes

This keeps the first runnable slice narrow and easy to evaluate.

## Stop Conditions

Stop or roll back the helper lane if:

- it starts to sound like field authority
- it drifts into prediction
- it generates low-value repeated notes
- it creates authorship confusion
- it pressures the team to merge helper output into truth routes

## Checkpoint Verdict

PASS

Why:

- the carrier is now explicit
- the route rail is separate
- the TypeScript file map is concrete
- the read-only constraints are stated at the repo-shape level
- the helper lane remains outside the instrument throat

## Anchor

Let the helper sit near the console, not inside the instrument’s throat.
