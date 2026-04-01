# Normalization Cleanup Report

Date: 2026-03-25

## Scope

This report captures the MT-07 normalization-first cleanup pass that added upstream candidate-shaping flags in `normalizationService.js` and wired explicit suppression reasons through `scoringService.js`.

Anchor line:

Purify the candidate before judging the candidate.

## Measurement Note

The audit windows in this app are rolling windows, not fixed lab snapshots. That means before/after counts are directional, not perfectly controlled. The strongest comparison is:

- baseline captured immediately before the normalization pass
- immediate local verification during rollout
- current live audit after the pass settled into the running server

## Baseline Before Normalization Pass

Captured during the threshold-tuning stage before the normalization cleanup was added.

| Window | Visible Tape | Suppressed | Single-Family Visible |
| --- | ---: | ---: | ---: |
| 6h | 5 | 20 | 3 |
| 24h | 27 | 76 | 17 |

Primary suppression reasons at that stage:

- `single_family_low_event_likeness`
- `single_family_low_confidence`
- `weak_cluster_precheck`
- `diplomacy_requires_more_support`
- `generic_roundup`

## Immediate Post-Pass Verification

The first local verification after the normalization cleanup landed showed:

| Window | Visible Tape | Suppressed | Single-Family Visible |
| --- | ---: | ---: | ---: |
| 6h | 7 | 15 | 1 |

Interpretation:

- single-family leakage dropped sharply
- suppressed clusters were being held out for more specific upstream reasons
- the tape stayed alive rather than collapsing

## Current Live State

Current live snapshot and audit state at report generation:

- Dashboard generated at `2026-03-25T14:57:18.423Z`
- Snapshot mode: `live_api`
- Board event tape: `10` tracked updates
- Cross-Source Coherence: `0.95`
- Source Diversity: `54 feeds`
- Board note: `19 weaker clusters were held out of the visible tape.`

Current live cluster-quality audit:

| Window | Raw Items | Processed Clusters | Visible Tape | Suppressed | Single-Family Visible | Multi-Family Clusters |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 6h | 55 | 28 | 9 | 19 | 4 | 5 |
| 24h | 153 | 96 | 25 | 71 | 14 | 11 |
| 72h | 432 | 299 | 85 | 214 | 58 | 28 |

Current top suppression reasons:

### 6h

- `single_family_low_event_likeness` x9
- `diplomacy_requires_more_support` x6
- `single_family_low_confidence` x2
- `weak_cluster_precheck` x2

### 24h

- `single_family_low_event_likeness` x37
- `single_family_low_confidence` x11
- `diplomacy_requires_more_support` x10
- `weak_cluster_precheck` x10
- `generic_roundup` x2
- `non_event_infrastructure` x1

### 72h

- `single_family_low_event_likeness` x121
- `single_family_low_confidence` x32
- `weak_cluster_precheck` x27
- `diplomacy_requires_more_support` x18
- `noise_score_too_high` x7
- `generic_roundup` x6
- `non_event_infrastructure` x1

## New Normalization Flags Observed

Local 72-hour verification showed the new upstream flags firing on real intake:

| Flag | Count |
| --- | ---: |
| `commercialVendorLike` | 1 |
| `promoWrapper` | 0 |
| `genericServiceUpdate` | 0 |
| `nonEventInfrastructure` | 1 |
| `articleHubLike` | 2 |

This means the new machinery is active, but the current live windows simply do not contain much commercial/service-wrapper noise right now. The pass is ready for that intake when it appears.

## Suppressed Samples Driven By New Reasons

Verified locally over a 72-hour window:

1. `Wall Sconces Set Of Two Battery Operated Rechargeable Light Bulb With Remote...`
   - Category: `infrastructure`
   - Reason: `non_event_infrastructure`
   - Confidence: `0.61`
   - Event-likeness: `0.69`
   - Region: `United States`

2. `Latest Articles`
   - Category: `security`
   - Reason: `article_hub_like`
   - Confidence: `0.57`
   - Event-likeness: `0.00`
   - Region: `United States`

These are exactly the kinds of false-event textures this pass was meant to remove upstream.

## Visible Rows That Almost Got Suppressed

Current 24-hour near-threshold visible rows with the lowest surviving signal strength:

1. `New Chile president withdraws support for Bachelet UN chief bid`
   - Category: `diplomacy`
   - Families: `2`
   - Confidence: `0.75`
   - Event-likeness: `0.70`
   - Signal strength: `0.644`

2. `Russia says it shot down almost 400 Ukrainian drones as Moscow and Kyiv escalate aerial barrages`
   - Category: `security`
   - Families: `3`
   - Confidence: `0.81`
   - Event-likeness: `0.70`
   - Signal strength: `0.726`

3. `Iran war is fuelling climate change Conflict released over 5 MILLION tons of CO2 in just two weeks...`
   - Category: `security`
   - Families: `1`
   - Confidence: `0.73`
   - Event-likeness: `0.88`
   - Signal strength: `0.770`

These are useful watch items for the next pass because they show where the gate is currently choosing to remain permissive.

## Visible Rows That Show The Pass Working

Representative current visible rows:

1. `The Latest Iran receives 15-point ceasefire proposal from US, Pakistan officials say`
   - Category: `diplomacy`
   - Families: `7`
   - Confidence: `0.91`

2. `Live updates, U.S. proposes ceasefire, troops head to Middle East NBC10 Philadelphia`
   - Category: `diplomacy`
   - Families: `4`
   - Confidence: `0.91`

3. `Power Outage Affects About 1,500 EPUD Customers in Lane County`
   - Category: `infrastructure`
   - Families: `2`
   - Confidence: `0.79`

These are not just recent arrivals. They survived rule-based appearance with stronger support and clearer event form.

## Verdict

PASS

Why:

- the tape is cleaner by form, not just smaller by force
- named refusal reasons are now visible in the audit path
- upstream cleanup is demonstrably catching non-event infrastructure and article-hub noise
- single-family visibility remains under pressure without collapsing the board

## Next Watch

The next move should be observation, not another large rewrite.

Watch these over `24h` and `72h`:

- `single_family_visible_count`
- `visible_tape_cluster_count`
- `top_suppression_reasons`
- whether `commercial_vendor_noise`, `promo_wrapper`, and `generic_service_notice` begin appearing naturally

Only after that should another small retune be considered.
