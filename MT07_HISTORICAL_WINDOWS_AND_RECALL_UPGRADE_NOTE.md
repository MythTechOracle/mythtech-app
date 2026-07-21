# MT07 Historical Windows And Recall Upgrade Note

Date: 2026-07-19

## Status

This note captures a product and architecture gap in the current Live Signals app:

- the app is healthy
- the app is not necessarily missing events in a broken way
- the app is currently centered on the latest selected `6h` snapshot

That means known real-world developments can fall outside the visible board even when the system itself is working as designed.

This is an upgrade note.

Implementation status:

- Phase 1 backend window rebuild support has started.
- Phase 2 basket / domain recall has started as a read-only health report.
- Phase 3 infrastructure continuity backfill has started as a read-only health report.

## Core Observation

The current route layer reads the selected snapshot bundle first and only builds a fresh bundle when no selected snapshot exists.

Today that practical behavior is:

- dashboard reads the selected snapshot bundle
- events reads the selected snapshot bundle
- metrics history reads the selected snapshot bundle's stored history object
- fresh snapshot generation currently rebuilds a `6h` window

So the app is primarily answering:

`what does the currently selected 6h chamber look like`

It is not yet answering:

- what did the last `24h` actually contain
- what did the last `72h` actually contain
- what did the last `7d` actually contain
- what did recent baskets see even if the current board no longer shows them

## Why This Matters

This creates a predictable operator confusion case:

- an earthquake or power disruption is known to have happened
- the current live board is security-heavy
- the visible infrastructure lane is empty
- the operator naturally asks whether the app missed the event

The cleaner answer is usually:

The app did not necessarily miss it.
The app is showing the latest selected field, and that field may no longer carry the earlier event inside the currently visible slice.

That is a recall and temporal continuity problem, not necessarily a normalization failure.

## Governing Law

MT-07 should remain the visible governing instrument.

These upgrades should not turn the app into a retrospective truth blender or a weak-signal theater engine.

They should only improve:

- temporal recall
- basket memory
- domain continuity
- operator explanation

Companion line:

The board should not pretend the field was empty merely because the current chamber is narrow.

## The Three Highest-Value Upgrades

### 1. True Historical Window Rebuilds

Add explicit rebuild paths for:

- `24h`
- `72h`
- `7d`

These should be real rebuilds from stored intake and processed material, not simply the current `6h` bundle with comparison labels or baseline summaries attached.

Goal:

- let operators ask what the field actually looked like across wider windows
- reduce false "nothing happened" impressions
- preserve lawful differences between short-window and wide-window readings

Minimum design expectation:

- separate window query handling from the default selected snapshot path
- generate or retrieve bundles whose `window.start` and `window.end` actually match the requested range
- mark these bundles clearly as historical rebuilds or replay windows

### 2. Basket / Domain Recall View

Add a recall surface that shows what recent baskets or recent domain passes actually saw, even if those items are not present in the latest visible slice.

This can remain an explain or audit surface first.

Initial route:

`/api/health/basket-recall?window=24h`

Supported examples:

- `/api/health/basket-recall?window=24h`
- `/api/health/basket-recall?window=72h&domain=signals`
- `/api/health/basket-recall?window=7d&domain=all&sample_limit=1`

This surface is raw-intake recall only.
It reports what the connector layer recently saw by domain and basket.
It does not assert dashboard visibility, event confirmation, scoring authority, or corroboration.

Goal:

- show whether infrastructure, security, diplomacy, or other lanes were recently active
- show whether a known event appeared in an earlier basket and then dropped out of the live board
- reduce ambiguity between absence-of-truth and absence-from-current-chamber

Useful payload ideas:

- recent basket name
- basket run time
- domain
- top categories seen
- candidate item count
- held-out count
- visible count
- sample headlines or sample cluster labels

### 3. Infrastructure Watch Backfill Lane

Add a narrow continuity lane for infrastructure-sensitive developments such as:

- power outages
- grid instability
- port disruption
- rail disruption
- airport disruption
- pipeline or utility interruptions

This lane should not bypass MT-07 visibility law.
It should act as a continuity aid when the main live basket rotates toward another concentration such as security.

Goal:

- keep infrastructure-relevant developments from disappearing too completely between basket turns
- preserve continuity for slower-moving consequence events
- make it easier to explain why a known disruption is not in the main visible tape

The safest first form is:

- audit-side or explain-side backfill
- not top-board promotion
- not independent event authority

Initial route:

`/api/health/infrastructure-backfill?window=72h&current_window=6h`

Supported examples:

- `/api/health/infrastructure-backfill?window=24h&current_window=6h`
- `/api/health/infrastructure-backfill?window=72h&current_window=6h&domain=signals`
- `/api/health/infrastructure-backfill?window=7d&current_window=6h&domain=all&sample_limit=1`

This surface is continuity context only.
It reports infrastructure-sensitive raw intake that appears in a wider window and separates:

- current-window overlap
- continuity backfill outside the current selected chamber

It does not publish candidates into the visible tape, score them as live field authority, or count them as corroboration.

## Clean Distinction

The earthquake itself may not always classify as infrastructure disruption.
Its downstream consequences might.

That means the right question is not only:

`did the app ingest the earthquake`

It is also:

- did intake text about infrastructure consequences exist in the relevant window
- did it survive normalization
- did it survive category assignment
- did it survive the selected basket and visibility logic
- is it still visible in the current live chamber

That distinction should remain explicit in any future UI or audit wording.

## Recommended Rollout Order

### Phase 1

Add true historical rebuild support for `24h`, `72h`, and `7d`.

This gives the strongest immediate value with the least doctrinal ambiguity.

### Phase 2

Add basket / domain recall in explain or audit surfaces.

This gives operators a reasoned answer to:

`what did the system see recently even if it is not on the board now`

Initial implementation:

- route: `/api/health/basket-recall`
- service: `buildBasketRecall`
- authority: `raw_intake_recall_only`
- supported window labels: `6h`, `24h`, `72h`, `7d`
- supported domain scopes: `signals`, `uap`, `all`

### Phase 3

Add a narrow infrastructure watch backfill lane.

This should remain subordinate to current field truth and should not become a second visibility engine.

Initial implementation:

- route: `/api/health/infrastructure-backfill`
- service: `buildInfrastructureBackfill`
- authority: `continuity_backfill_only`
- promotion: `promotion_allowed: false`
- supported window labels: `6h`, `24h`, `72h`, `7d`
- default comparison: wider `72h` window against current `6h` chamber

## No-Go Boundaries

Do not solve this only with cosmetic UI copy.

Do not inflate stale or weak items into live field authority just to make the board feel fuller.

Do not collapse:

- current live chamber
- historical replay
- held-out pressure
- basket recall

into one undifferentiated truth lane.

The app stays stronger if those layers remain visibly distinct.

## Compressed Recommendation

The highest-value fix is not a prettier empty state.

It is:

- true historical window rebuilds
- basket recall
- infrastructure continuity backfill

in that order.

## Closing Read

The app is currently very good at telling the operator what the selected `6h` chamber looks like.

The next maturity step is to help the operator understand what the wider field recently looked like without corrupting the honesty of the live board.
