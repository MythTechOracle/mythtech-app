# MT07 UAP Anomaly Watch Fit Plan

Date: 2026-04-29

## Status

This plan maps the `MT07 Anomaly Watch` concept onto the current MT-07 Live Signals app.

The purpose is not to turn the current app into a belief engine.
The purpose is to decide which parts of the existing Signal stack already fit a UAP anomaly-monitoring fork, and which parts must fork cleanly.

This is a fit plan, not an activation note.

The current repo already provides four reusable assets:

- a governed intake boundary
- a snapshot-backed operator board
- a read-only helper / audit lane
- SQLite-backed pipeline memory

## Governing Law

Use the current MT-07 stack as a descriptive anomaly monitor under evidentiary pressure, not as a UFO truth engine.

Companion line:

This app does not determine what UAPs are.
It measures how claims move through evidence, correction, explanation pressure, and institutional visibility.

## Current App Fit

The current app already enforces a lawful path:

`text -> normalization -> incident form -> event geography -> cluster incident identity -> category -> escalation -> field authority -> visibility -> recovery/thin-sample honesty -> metrics -> audit`

That discipline is the right substrate for a UAP adaptation.

What reuses cleanly now:

- connector and raw-intake separation
- normalization before visibility
- source-family-aware clustering
- snapshot-backed board delivery
- thin-sample honesty and degraded / empty states
- read-only helper and handoff sidecars

What must fork for UAP use:

- the category taxonomy in `server/config/categories.js`
- the query baskets in `server/config/sources.js`
- some incident-identity assumptions tuned for infrastructure / conflict language
- metric language that currently centers escalation more than explanation pressure

## Four-Layer Architecture

### 1. Intake Layer

Every claim should enter as one of four shapes:

- discourse item
- event report
- media artifact
- official statement

No truth language belongs here yet.

Minimum intake fields:

- evidence class
- source family
- observed / published time
- geography if known
- claimed object or event
- claimed sensor basis
- first-hand vs commentary status

Current repo fit:

- `server/connectors/*`
- `server/jobs/ingest*.js`
- `raw_items` in `server/db/schema.sql`

Recommended storage posture:

- keep new provenance-heavy fields in `raw_payload` first
- only promote fields into durable columns after the vocabulary stabilizes

### 2. MT-07 Descriptive Layer

This is the board-producing layer.

The order should become:

`claim intake -> provenance check -> normalization -> incident form -> explanation pressure -> source-family separation -> corroboration pressure -> visibility gate -> thin-sample honesty -> metrics -> audit`

This layer should answer:

- what entered the field
- how strong the provenance is
- how independent the sources are
- which ordinary explanations are still live
- what remains unresolved after correction pressure is applied

Current repo fit:

- `server/services/normalizationService.js`
- `server/services/clusteringService.js`
- `server/services/scoringService.js`
- `server/services/snapshotService.js`
- `/api/dashboard`
- `/api/events`
- `/api/explain/metric/:key`

### 3. MT-08 Calibration Layer

Nothing should become durable law from MT-07 alone.

This second gate should:

- verify provenance claims
- calibrate weights and tolerances
- prevent high-interest events from becoming high-confidence events by momentum alone
- keep explanation pressure visible before sealing confidence

Current repo fit:

- `server/services/mt07EnvelopeService.js`
- `server/services/mt07KernelSessionService.js`
- the existing read-only helper audit pattern under `server/claude-helper/`

Recommended early form:

- a sidecar review / packet state such as `calibration_pending`
- no automatic rewrite of board truth

### 4. Registry / Memory Layer

Only after emission and intake acknowledgement should durable memory be written as settled history.

Current repo fit:

- `processed_events`
- `metric_snapshots`

Recommended future writebacks:

- source lineage
- correction history
- operator notes
- calibration receipts

Writebacks should stay localized and reviewable.

## Lane Design

### Disclosure / Discourse Lane

This is the best Phase 1 lane.

Use it for:

- hearings
- official statements
- official documents
- policy / oversight movement
- journalist and researcher reporting

Why it fits first:

- it maps cleanly to curated RSS and document-style intake
- it matches the existing board cadence
- it is easier to keep provenance visible

### Event / Anomaly Lane

This is a later lane.

Use it for:

- sighting reports
- witness accounts
- media artifacts
- sensor claims
- repeated local or regional anomalies

Do not start this lane with uncontrolled social ingest.

It needs:

- provenance handling
- repost suppression
- explanation pressure
- witness-independence logic

before broader intake can be trusted.

## Evidence Classes

Recommended first evidence classes:

- `official_statement`
- `official_document`
- `journalist_report`
- `researcher_analysis`
- `first_hand_witness_report`
- `multi_witness_report`
- `video_photo_claim`
- `sensor_claim`
- `repost_commentary_only`

These should not be collapsed into the current infrastructure / conflict categories.

## Category Fork

Do not force UAP intake into the current taxonomy:

- `security`
- `diplomacy`
- `infrastructure`
- `policy`
- `information`
- `cyber`
- `maritime`

That taxonomy reflects the present Live Signals board, not this domain.

The UAP fork needs its own domain map, likely along lines such as:

- disclosure
- official release
- witness report
- media artifact
- sensor report
- debunk or correction
- ordinary explanation

The exact labels can change later.
The important part is to fork the domain vocabulary rather than misclassify claims into a conflict board.

## Metric Fit

Metrics that carry over well now:

- `signal_velocity`
- `source_diversity`
- `correction_rate`
- `cross_source_coherence`
- `uncertainty_index`

Metrics that can stay, but need reinterpretation:

- `volatility_index`
- `escalation_pressure`

For this domain, `escalation_pressure` should not disappear, but it should no longer stand alone.
It needs neighboring metrics such as:

- `explanation_pressure`
- `institutional_disclosure_pressure`

Recommended UAP-first additions:

- `provenance_strength`
- `witness_independence`
- `explanation_pressure`
- `unresolved_anomaly_count`

Later additions:

- `video_repost_churn`
- `sensor_claim_density`
- `repeat_location_pressure`

Current repo touchpoints for this work:

- `src/live-signals/types.js`
- `server/services/scoringService.js`
- `/api/explain/metric/:key`

## Surface States

Keep the transport modes unchanged:

- `live_api`
- `degraded`
- `mock`
- `empty`

Add UAP-specific field states above the transport layer:

- `thin_field`
- `repost_churn`
- `high_claim_low_provenance`
- `institutional_pressure_rising`
- `ordinary_explanation_available`
- `unresolved_but_unconfirmed`
- `calibration_pending`

These should behave like governed field-state labels, not like transport-mode replacements.

## MVP Sequence

Recommended safe order:

1. start with curated disclosure / discourse intake
2. add a provenance-first anomaly event tape with tightly curated entries
3. add correction / debunk tracking and ordinary-explanation flags
4. add explain surfaces for provenance and explanation pressure
5. add an MT-08 calibration queue before any durable confidence uplift
6. only then consider broader media intake or semi-open witness submission

## Concrete Repo Mapping

The cleanest extension points are:

- intake connectors: `server/connectors/rssConnector.js`, `server/jobs/ingestRss.js`
- source registry and baskets: `server/config/sources.js`
- category taxonomy: `server/config/categories.js`
- normalization and incident form: `server/services/normalizationService.js`
- clustering and source-family separation: `server/services/clusteringService.js`
- metrics, visibility, and thin-sample honesty: `server/services/scoringService.js`
- snapshot transport: `server/services/snapshotService.js`
- board and explain routes: `server/routes/dashboard.js`, `server/routes/events.js`, `server/routes/explainMetric.js`
- sidecar / calibration-adjacent packets: `server/services/mt07EnvelopeService.js`, `server/services/mt07KernelSessionService.js`
- helper audit boundary: `server/claude-helper/`
- storage base: `server/db/schema.sql`

## Stop Conditions

Stop or narrow the fork if:

- repost volume is being mistaken for corroboration
- ordinary explanation handling becomes cosmetic instead of gating
- belief language starts appearing in operator-facing board text
- calibration is skipped for high-interest events
- source-family concentration is hidden by multi-post churn

## Recommended Next Move

The clean next build step is not a full live-data fork.

It is a UAP shadow-lane prototype that:

- reuses the current board shell
- forks the category and query vocabulary
- adds evidence classes and explanation-pressure handling in normalization and scoring
- exposes one UAP-safe mock or snapshot bundle before any new live intake is trusted

That would prove doctrine before opening the hardest lane.

## Verdict

PASS, FIT-PLAN STAGE

Why:

- the existing MT-07 pipeline already matches anomaly monitoring better than belief software
- the repo has the right boundaries for provenance-first buildout
- the biggest risks are taxonomy drift and intake discipline, not board feasibility

## Anchor

Let the board show how claims travel under pressure.
Do not ask it to settle the metaphysics.
