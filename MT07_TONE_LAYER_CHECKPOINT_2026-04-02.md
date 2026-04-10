# MT-07 Tone Layer Checkpoint

Date: 2026-04-02

## Status

The first MT-07 custom tone layer is now active as a lawful descriptive layer in the Live Signals app.

This pass adds tone as:

- a per-item `tone_profile`
- a cluster-level rhetorical posture summary
- a window-level `tone_metrics` summary
- an explain-facing `tone_pressure` surface
- supporting language for `Tree of Relief — Moment Resolve`

This pass does **not** add tone as a top-row board metric or a visibility governor.

## Governing Law

Tone may describe how the field is speaking, but it may not overrule what the field is.

Companion line:

The app now measures what the field is, and tone helps name how the field is speaking, without overruling truth.

## Why This Pass Matters

The app already distinguishes:

- what entered
- what formed
- what was refused
- what this cycle resolved into

The tone layer now helps the app speak one step more clearly about rhetorical posture without crossing into sentiment theater, prediction, or visibility inflation.

It keeps two voices alive at once:

- one voice for method
- one voice for meaning

## What Was Added

### 1. Normalized item tone

Each normalized item can now carry:

- `raw_probabilities`
- `top_tone_raw`
- `top_tone_display`
- `top_tone_confidence`
- `tone_margin`
- `tone_entropy`
- `tone_entropy_norm`
- `tone_state`
- `tone_signals`

Current raw internal classes:

- `neutral`
- `curious`
- `frustrated`
- `defensive`

Current MT-07 display classes:

- `neutral -> procedural`
- `curious -> exploratory`
- `frustrated -> hardening`
- `defensive -> guarded`

### 2. Cluster-led aggregation

Tone is aggregated through formed clusters rather than treated as a raw chatter mass.

Cluster outputs now include:

- `cluster_top_tone_display`
- `cluster_top_tone_confidence`
- `cluster_tone_entropy_norm`
- `cluster_tone_state`
- `cluster_tone_signals`

### 3. Window summary

The dashboard now exposes `tone_metrics` with:

- `top_tone_display`
- `top_tone_confidence`
- `tone_entropy_norm`
- `tone_state`
- `basis_cluster_count`
- `basis_visible_count`
- `summary_note`

### 4. Explain-first placement

Tone is currently visible through:

- `bundle.explain.tone_pressure`
- `tone_context` on `volatility_index`
- `tone_context` on `escalation_pressure`
- `Tree of Relief — Moment Resolve` wording when basis is sufficient

Tone is intentionally **not** in the main metric row for `v1`.

## Guardrails Preserved

The tone layer does **not** change:

- field relevance
- event likeness
- tape gating
- source count or source-family count
- escalation math
- volatility math

Incident logic still decides the field.
Tone logic helps describe its rhetorical posture.

## Thin / No-Call Behavior

This pass added an explicit `insufficient_basis` outcome.

If the sample is empty or too thin, tone does not pretend to know more than the field allows.

That is why thin and no-call windows can now say things like:

`Tone basis remains too thin to sharpen the read.`

This is the right MT-07 outcome:

- the field may still be active underneath
- the board may still refuse visible appearance
- the tone layer must remain subordinate to that refusal

## Tree of Relief Relationship

The board subtitle now reads:

`Narrative audit of the present window, not a forecast.`

Tone supports that resolve only when it materially clarifies the reading.

It should not appear merely because tone data exists.

The current discipline is:

- field first
- tone second
- resolve only where basis is sufficient

## Current Placement in the App

Primary implementation points:

- `server/services/normalizationService.js`
- `server/services/clusteringService.js`
- `server/services/scoringService.js`
- `src/live-signals/adapter.js`
- `src/live-signals/components/LiveSignalsBoard.js`
- `src/live-signals/fixtures.js`

Current surface behavior:

- explain and audit first
- Tree of Relief support wording second
- no dedicated tone card yet

## Small Refinements To Watch

These are worth watching in later passes:

1. internal raw class naming may later move closer to field-native wording
2. `tone_signals` should stay sparse and operator-readable
3. Tree of Relief should mention tone only when it truly changes the resolve
4. a board-facing tone panel should come only after this layer proves useful in repeated live cycles

## Checkpoint Verdict

PASS

Why:

- tone entered as a lawful descriptive layer
- incident truth stayed sovereign
- explain surfaces became richer without making the board noisier
- thin and empty windows kept their honesty
- Tree of Relief gained support without drifting into prediction

## Anchor

One voice for meaning, one voice for method.
