# GKG Shadow Lane Fit Plan

Date: 2026-04-26

## Status

This document defines the clean fit for a GKG-style shadow lane around the MT-07 Live Signals app.

The repo currently has:
- `GDELT DOC` as the live external news/doc lane
- `ACLED` present, but gated by access
- optional curated `RSS` planning
- `Event Registry` reserved as a later shadow-discovery lane

The repo does **not** currently model `GKG` as a first-class named intake lane.

This is a fit plan, not an activation note.

Current posture:

- architecture note: yes
- activation authority: no
- contract drafting next: yes

## Governing Law

Let GKG widen context, not authorship.

Companion line:

GKG may enrich themes, entities, framing, and audit context, but MT-07 remains sovereign over visibility, scoring, corroboration, and operator-facing truth.

## Contract Tightening Required Before Build Action

The fit is sound, but the lane should not move toward implementation until four things are explicit:

- shadow-lane admission contract
- field semantics for descriptive metadata
- measurable promotion / stop thresholds
- operator-facing wording law

That means the next step is contract drafting, not connector activation.

## Why This Fits

The Signal app already has a governed path:

`text -> normalization -> incident form -> event geography -> incident identity -> category -> escalation pressure -> field authority -> visibility -> recovery / thin-sample honesty -> metrics -> audit`

GKG-style material fits naturally because it is mostly:
- text-derived context
- theme/entity enrichment
- framing and tone metadata
- relation hints around what the event language is doing

That means it belongs best as a shadow layer around the event body, not as the event body itself.

The app already contains proto-GKG behavior in its own pipeline:
- normalization extracts language features
- clustering aggregates incident identity
- tone logic summarizes rhetorical posture
- explain surfaces translate that posture into audit-readable context

So GKG is not alien to the build.
It is a formalization of a context lane the build already partially performs for itself.

## Event / GKG Distinction

Keep these categories conceptually distinct.

### Event

An event record is action-oriented.

Use it for:
- who did what
- where it happened
- when it happened
- the operative incident identity

In MT-07 terms, this is closer to:
- incident form
- event geography
- cluster identity
- field-visible event structure

### GKG

GKG is text-derived context around the event.

Use it for:
- themes
- named entities
- organization / person / place mentions
- quote and mention context
- tone and framing posture
- relation hints around how the event is being described

In MT-07 terms, this is closer to:
- audit enrichment
- explain enrichment
- tone/context support
- helper-side descriptive support

GKG is not direct event authority.

### GDELT DOC

The current repo connector is `GDELT DOC`, not a dedicated GKG lane.

Use it for:
- article/document intake
- topical watchfulness
- text that can be normalized into the governed MT-07 path

So the current build is `GDELT-first`, but not yet `GKG-modeled`.

### ACLED

ACLED is structured conflict/event corroboration.

Use it for:
- structured event checks
- geometry/actor quality comparison
- later cross-lane corroboration

ACLED is not text-derived framing metadata.

## Adopt Now

Adopt GKG first as a shadow enrichment concept.

Best Phase 1 role:
- held-out context on normalized items
- explain/audit enrichment
- cluster-side descriptive metadata
- helper-lane read context
- no direct visibility influence

Good first GKG-like field groups:
- `themes`
- `entity_mentions`
- `org/person/place` lists
- `quote_markers`
- `framing_signals`
- `tone_support`
- `relation_hints`

Preferred first behavior:
- attach the metadata after intake, not before law
- keep it subordinate to incident shaping
- surface it in explain or audit before any board-facing UI promotion

## Shadow Admission Contract

Every GKG-side artifact should carry a minimal admission contract before it is allowed into any shadow surface.

Required fields:
- `source_lane`
- `source_doc_id`
- `source_family`
- `parser_version`
- `extraction_time`
- `bound_event_ids[]`
- `confidence`
- `shadow_only=true`
- `non_corroborative=true`

Recommended supporting fields:
- `source_url`
- `language`
- `document_timestamp`
- `ingest_batch_id`
- `normalization_run_id`

Contract law:
- no GKG artifact may appear unbound to a source document
- no GKG artifact may imply field authority without a bound event/body context
- no GKG artifact may arrive without explicit `shadow_only` and `non_corroborative` flags

## Phase 1 Field Semantics

Field names alone are not enough. The first pass should define controlled semantics so the lane stays governed instead of drifting into poetic metadata.

### `framing_signals[]`

Keep this enum-like and small.

Suggested allowed values:
- `escalatory_language`
- `deescalatory_language`
- `procedural_language`
- `corrective_language`
- `uncertainty_cue`
- `attribution_blur`

### `relation_hints[]`

Treat these as weak structural hints, not truth claims.

Suggested allowed values:
- `actor_to_actor`
- `actor_to_location`
- `actor_to_institution`
- `claim_to_source`
- `statement_to_target`

### `tone_support`

Keep this bounded to structured support fields, not free prose.

Suggested shape:
- `top_tone_display`
- `top_tone_confidence`
- `tone_entropy_norm`
- `tone_state`
- `basis_signal_count`

Semantic law:
- descriptive metadata may assist interpretation
- descriptive metadata may not replace incident-body law
- weak semantic hints must remain visibly weaker than normalized event structure

## Adopt Later

Treat a dedicated GKG connector or parser as a later shadow-lane candidate.

Best Phase 2 role:
- compare event-body output against text-derived context
- inspect whether themes sharpen cluster understanding
- inspect whether entity patterns improve audit clarity
- inspect whether quote/framing context improves helper summaries without inflating authority

Only consider selective promotion after proof that it:
- improves audit clarity
- improves cluster interpretation without changing core truth law
- does not create false corroboration pressure
- does not inflate thin or weak samples into apparent certainty

## Promotion Gates And Thresholds

Do not promote any GKG-derived field toward broader use until it clears measurable thresholds.

Suggested gates:
- audit clarity improvement above a named baseline
- no increase in false corroboration interpretations during review
- no measurable rise in weak-cluster inflation
- operator misread rate below a defined ceiling

Suggested proof questions:
- did GKG metadata help the operator understand the event body more clearly
- did it reduce or increase ambiguity
- did it trigger mistaken confidence more often than baseline
- did it create extra surface drama without stronger event structure

Promotion law:
- repeated live-cycle proof is required
- subjective enthusiasm is not enough
- any unclear gain defaults to non-promotion

## Never

Do not let GKG:
- publish directly to the tape
- bypass normalization
- bypass incident shaping
- bypass field authority
- bypass visibility gates
- decide scoring
- decide escalation
- count as corroboration by itself
- become a shadow truth engine

Do not treat:
- entity count as event certainty
- theme concentration as field authority
- quote density as importance
- framing posture as event truth
- GKG as a replacement for MT-07 judgment

## Phase 1 GKG Shadow Fields

Keep the first GKG pass narrow and audit-first.

Recommended fields:
- `themes[]`
- `entities.people[]`
- `entities.organizations[]`
- `entities.locations[]`
- `framing_signals[]`
- `quote_presence`
- `quote_count_estimate`
- `language_context`
- `tone_support`

Preferred first surfaces:
- normalized-item metadata
- cluster audit metadata
- explain sidecar notes
- helper advisory summaries

Do not make it:
- a visibility governor
- a tape card
- a headline-ranking authority

## Duplication / Noise Checks Against Current GDELT DOC Path

Any future GKG lane should be graded against the existing GDELT DOC path before trust increases.

Check:
- entity spam
- theme inflation
- repeated source-family churn
- location drift
- quote theater
- framing drama without event authority
- context gain vs noise gain

For GKG:
- check whether the metadata clarifies the existing incident body or only broadens descriptive noise
- check whether theme/entity overlap is genuinely useful or just restates the same article family in denser form

## Machine Checks And Provenance Rules

The duplication and noise checks should become machine-checkable rules wherever possible.

Good first checks:
- one source-family cap per cluster-side GKG summary
- location divergence flag when GKG locations disagree with normalized event geography
- quote-density ceiling to prevent quote theater
- overlap scoring against already-normalized GDELT DOC output
- entity repetition cap per source-family window
- theme repetition flag when the same article family restates the same theme cloud without new incident value

Provenance law:
- every summary must point back to source docs
- every derived field must be parser-versioned
- every binding to an event body must be traceable
- every shadow artifact must be discardable without harming event truth

## Sovereignty Boundary Rules

MT-07 remains sovereign over:
- visibility
- scoring
- escalation pressure
- field authority
- corroboration logic
- operator-facing truth

GKG may:
- widen context
- widen interpretive support
- enrich audit
- enrich explain surfaces
- support helper-side summaries

It may not:
- decide what earns appearance
- decide what the field means
- outrank the governed runtime pipeline

## Operator Wording Law

Any operator-facing or helper-facing surface using GKG should state its status plainly.

Recommended wording:

`Context support only — not event authority, not corroboration, not visibility logic.`

Surface law:
- if GKG appears, its subordinate status must appear with it
- no UI card should imply that entity/theme density equals importance
- no helper summary should treat framing metadata as settled truth

## Minimal Implementation Order

1. document the GKG shadow-lane boundary
2. define a minimal GKG shadow schema
3. attach GKG-style metadata only as held-out context on normalized or clustered items
4. surface it first in audit/explain reads
5. measure whether it improves clarity without inflating authority
6. consider selective promotion only after repeated live-cycle proof

## Stop Conditions

Stop or narrow a GKG lane if:
- it inflates weak clusters
- it creates entity/theme noise without event clarification
- operators start treating it as direct truth
- it pressures the build toward sentiment theater
- it creates corroboration confusion
- it starts outranking the event body instead of serving it

## Verdict

PASS, WITH CONTRACT TIGHTENING BEFORE BUILD ACTION

Why:
- GKG fits the app’s existing descriptive architecture
- the build already contains proto-GKG behavior through normalization, tone, clustering, and explain
- it can deepen audit context without breaking MT-07, if it remains subordinate to the governed event pipeline
- the architecture is ready for contract drafting, but not yet for full connector activation

## Anchor

The current build has explored the GDELT world mostly through document intake and internal MT-07 enrichment, not through a named GKG lane.

This plan defines the clean future fit:

GKG should enter as a shadow context layer around events, not as a competing author of field truth.
