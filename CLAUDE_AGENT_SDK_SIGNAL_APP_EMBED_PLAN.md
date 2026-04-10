# Claude Agent SDK Signal App Embed Plan

Date: 2026-04-03

## Status

This plan defines a narrow Phase 1 role for an embedded Claude Agent SDK service around the MT-07 Live Signals app.

The governing split is:

- `MT-07 / Live Signals` = field-reading instrument
- `Claude Agent SDK service` = governed helper lane for audit, explanation, summary, and maintenance support

This is an assistant lane, not an acting lane.

## Doctrine Line

Claude may help tend, audit, summarize, and clarify the Signal app, but MT-07 remains sovereign over classification, publication, and field truth.

Companion line:

In Phase 1, let Claude carry the lantern, not the steering wheel.

## Purpose

Use the Claude Agent SDK as a repo-side helper service that can:

- inspect approved app surfaces
- summarize what changed
- clarify explain surfaces
- suggest checkpoints and next checks
- help operators and maintainers read the system more quickly

The service should not mutate board truth, scoring, or visibility.

## Architecture Placement

The Phase 1 service belongs in the control plane, not the field-law plane.

Recommended placement:

- TypeScript-first implementation inside the existing Node/Express repo
- read-only access to approved MCP tools and app state
- optional internal helper routes for operator-reviewed outputs

This fits the current stack better than Python for the first pass.

## Service Role

Service name:

- `Claude Helper Service`

Phase 1 responsibilities:

- audit notes
- maintenance summaries
- explain-helper text
- checkpoint suggestions
- operator-facing “what changed / what to inspect next” notes

This service observes and suggests.
It does not publish or govern.

## Allowed Inputs

Phase 1 may use only:

- read-only repo files
- read-only config and fixture files
- read-only dashboard payloads already produced by the app
- read-only history traces
- read-only explain endpoints
- read-only health endpoints
- read-only snapshot JSON
- read-only SQLite inspection surfaces
- explicit operator prompts
- optional lint/test output, but only as observation

The Phase 1 rule is:

- observe what the app already knows
- do not create a second hidden truth source

## Allowed Outputs

Phase 1 outputs should be limited to these advisory kinds:

- `audit_note`
- `maintenance_summary`
- `explain_helper`
- `checkpoint_suggestion`
- `warning_note`
- `next_test_recommendation`

Every output should be treated as:

- descriptive
- advisory
- operator-reviewed

No output is authoritative field state.

## The Never List

Phase 1 must explicitly forbid:

- direct writes into live board payloads
- direct writes into signal classifications
- autonomous code modification
- automatic rule installation
- silent prompt mutation
- self-triggered loops
- acting as system-of-record
- acting as field-truth authority
- predictive claims on behalf of Live Signals
- initiating rollback, MirrorPass, or rule sealing on its own
- changing scoring doctrine on its own

## Phase 1 Contract

Claude may observe, explain, summarize, and suggest.

Claude may not publish, decide, classify, seal, or rewrite the field.

This is the core contract for the embedded helper lane.

## Human Review Rule

The required flow is:

1. observe
2. interpret
3. suggest
4. human reviews
5. system acts

Not:

1. observe
2. decide
3. write
4. publish

Human review is required for every externally meaningful action.

## Minimal Phase 1 Endpoints

If we expose helper routes, keep them few and narrow.

Suggested first set:

- `/api/helper/audit`
- `/api/helper/maintenance-summary`
- `/api/helper/explain-assist`
- `/api/helper/checkpoint-suggest`

Suggested response shape:

- `kind`
- `input_scope`
- `summary`
- `observations`
- `warnings`
- `suggested_next_checks`
- `confidence_note`
- `operator_review_required: true`

These are helper outputs, not board outputs.

## Governance Controls

Bind the service with three control layers.

### Measure

What must remain true:

- read-only inputs only
- human-reviewed outputs
- no field publication
- no autonomous edits

### Allot

What may move:

- helper text
- summaries
- checkpoint suggestions
- audit notes

### Cut

When to stop or reset:

- repeated low-quality advice
- scope creep toward acting authority
- any attempt to overwrite board truth
- drift into prediction
- drift into governance claims

## Phase 1 Success Criteria

Do not grade Phase 1 on “intelligence.”
Grade it on restraint.

Success looks like:

- operators save time reading traces and summaries
- explain text becomes clearer
- checkpoint quality improves
- no live payload corruption
- no authorship confusion
- no authority confusion
- no hidden side effects

If force starts outrunning structure, the helper lane should be narrowed or turned off.

## Phase 2 Explicitly Deferred

Do not do these in Phase 1:

- direct board integration
- autonomous patch generation
- automatic code writes
- rule proposal installation
- live operator panel authorship
- predictive scenario generation

These may be reconsidered only after Phase 1 proves stable and useful.

## Current Repo Fit

This plan matches the repo’s current Claude-side shape:

- read-only project MCP first
- warn-first hooks
- repo-side planning and checkpoint support
- no sovereignty over MT-07 field law

That continuity matters.

## Checkpoint Verdict

PASS

Why:

- the service role is narrow
- the authority boundary is explicit
- the helper lane aligns with MT-07 rather than competing with it
- the first phase is measured by restraint and usefulness, not autonomy

## Anchor

One instrument for field law; one helper for craft law.
