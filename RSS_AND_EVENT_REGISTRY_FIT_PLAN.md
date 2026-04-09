# RSS And Event Registry Fit Plan

Date: 2026-04-07

## Status

This document defines the clean fit for RSS and Event Registry around the MT-07 Live Signals app.

The repo currently has two live external connector lanes:
- `GDELT`
- `ACLED` (present, but gated by access)

RSS and Event Registry would be the next truly new intake lanes.

This is a fit plan, not an activation note.

## Governing Law

Let RSS widen the watchlist, let Event Registry widen discovery, and let MT-07 remain the judge of appearance.

Companion line:

External intake may enrich the field, but MT-07 remains sovereign over visibility, scoring, corroboration, and operator-facing truth.

## Why This Fits

The Signal app already has a governed path:

`text -> normalization -> incident form -> event geography -> incident identity -> category -> escalation pressure -> field authority -> visibility -> recovery / thin-sample honesty -> metrics -> audit`

Any new intake lane must stay outside direct truth publication and pass through the same path before anything becomes operator-facing state.

RSS is a cleaner early fit because it is:
- simpler
- more open
- easier to curate
- easier to keep read-first

Event Registry is a better later fit because it is:
- broader
- more productized
- better for event discovery and comparison
- more suitable for shadow-lane validation before any promotion

## How RSS / Event Registry Differ From ACLED

Keep these lanes conceptually distinct.

### RSS

RSS is a curated source-feed lane.

Use it for:
- publisher feeds
- government statements
- infrastructure operator notices
- shipping / aviation / grid updates
- selected known watch sources

RSS is raw intake, not structured event truth.

### Event Registry

Event Registry is an event-discovery platform.

Use it for:
- broader event discovery
- grouped event comparison
- location/category/source filtering
- overlap and cluster-shape checks against GDELT

Event Registry is discovery infrastructure, not direct field authority.

### ACLED

ACLED is a structured conflict/event dataset.

Use it for:
- structured corroboration
- conflict/event comparison
- geometry and actor-quality cross-checking

ACLED is neither a news feed nor a generic discovery lane.

## Adopt Now

Adopt RSS planning first.

Best Phase 1 role:
- curated watch-source intake
- raw intake only
- held-out enrichment
- explain/audit context
- optional watch-source notes

Good first RSS source types:
- official government statements
- defense / military notices
- port / shipping notices
- aviation / NOTAM-style feeds where available
- grid / outage operators
- crisis-monitoring institutions
- carefully selected geopolitical watch sources

## Adopt Later

Treat Event Registry as a shadow-lane candidate.

Best Phase 2 role:
- compare against GDELT
- inspect overlap and duplication
- inspect location quality
- inspect source spread and cluster shape
- support helper-lane summaries later if it proves useful

Only consider selective promotion after proof that it:
- improves discovery without duplicating noise
- strengthens audit context
- does not create authority confusion

## Never

Do not let RSS or Event Registry:
- publish directly to the tape
- bypass normalization
- bypass incident shaping
- bypass field authority
- bypass visibility gates
- decide scoring
- decide escalation
- count as corroboration by themselves
- become shadow truth engines

Do not treat:
- RSS as structured corroboration
- Event Registry as operator-facing truth
- either lane as a replacement for MT-07 judgment

## Phase 1 RSS Source Types

Keep the first RSS pass narrow and curated.

Recommended buckets:
- government / foreign ministry statements
- military / defense notices
- port authority notices
- aviation notices
- grid / utilities outage notices
- crisis and humanitarian monitoring feeds
- selected geopolitical analysis feeds with clear source identity

Preferred first behavior:
- ingest raw feed items
- normalize into the same staging form as other intake text
- keep RSS-derived items off the tape until they pass the full pipeline
- optionally tag them as `watch_source` for audit visibility

## Phase 2 Event Registry Shadow-Lane Rules

If Event Registry is added later, keep it shadow-first.

Recommended rules:
- no direct visibility influence
- no scoring influence
- no corroboration authority by itself
- no tape authorship
- compare only against current GDELT / MT-07 output

Use it for:
- overlap checks
- missed-event discovery
- location-shape comparison
- source spread comparison
- cluster-shape comparison

## Duplication / Noise Checks Against GDELT

Any new lane should be graded against GDELT before trust increases.

Check:
- duplicate article pressure
- repeated source-family churn
- location noise
- weak cluster inflation
- headline drama without field authority
- event discovery gain vs noise gain

For RSS:
- check whether curated feeds add useful watchfulness or just repeat what GDELT already saw

For Event Registry:
- check whether grouped event discovery improves cluster quality or only broadens raw intake

## Sovereignty Boundary Rules

MT-07 remains sovereign over:
- visibility
- scoring
- escalation pressure
- field authority
- corroboration logic
- operator-facing truth

RSS and Event Registry may:
- widen intake
- widen watchfulness
- widen discovery
- enrich audit context

They may not:
- decide what earns appearance
- decide what the field means
- outrank the governed runtime pipeline

## Minimal Implementation Order

1. document the lane boundary
2. define Phase 1 RSS source types
3. add an RSS connector only for curated watch feeds
4. measure duplication and noise against GDELT
5. add Event Registry only as a shadow compare lane later
6. prove value before any selective promotion

## Stop Conditions

Stop or narrow a new lane if:
- it inflates weak clusters
- it duplicates GDELT without improving clarity
- operators start treating it as direct truth
- it pressures the repo toward bypassing MT-07 gates
- it creates corroboration confusion

## Verdict

PASS

Why:
- RSS is a clean near-term watch-source candidate
- Event Registry is a plausible later shadow-lane candidate
- both can fit without breaking MT-07 if they remain subordinate to the existing field pipeline

## Anchor

ACLED is present but gated by access; RSS and Event Registry would be the next truly new intake lanes.
