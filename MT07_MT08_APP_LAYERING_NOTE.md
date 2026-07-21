# MT07 MT08 App Layering Note

Date: 2026-06-22

## Status

This note defines a clean layering read for the Live Signals app:

- `MT-07` remains the visible governing instrument
- `MT-08` becomes the quiet backend calibration layer

This is a doctrine and architecture note, not an activation note.

It does not claim that the current app already contains a full standalone MT-08 intake chamber.
It proposes a lawful way to name and formalize behavior the app is already performing.

## Core Distinction

The Myth-Tech Delta Loom Deck is the source architecture.
The MT-07 Signal App is a separate applied instrument built from that architecture.

So the app is not part of the deck itself.
It is an applied descendant.

That means:

- the deck remains the generative source
- the app remains the specialized operational instrument
- `MT-07` remains the app's primary identity
- `MT-08` may operate as a supporting backend intelligence

## Governing Law

MT-07 governs visible signal direction, pressure, and operator attention.
MT-08 governs backend evidence admission, calibration, and record binding.

Companion line:

The MT-07 Signal App is The Vector demonstrating its special ability: carrying a meaningful line through a turbulent information field. MT-08 quietly weighs what deserves to enter that line.

## What The App Already Does

The current app already follows this spine:

`text -> normalization -> incident form -> event geography -> cluster incident identity -> category -> escalation -> field authority -> visibility -> recovery / thin-sample honesty -> metrics -> audit`

And that already implies three backend operations:

- weighing candidate material
- allowing or refusing candidate material
- binding accepted material into event-shaped records

So the discovery here is:

The app was already weighing, allowing, and binding.
It simply had not named those actions as one coherent calibration layer.

This is not decorative mythology pasted onto software after the fact.
It is a doctrine term exposing an architecture that already exists.

## The Two-Card Application Chain

### MT-07 — The Vector

Visible governing intelligence:

`Detect -> Orient -> Carry`

MT-07 answers:

- what signal is present
- where it is moving
- how much directional pressure it carries
- what should enter the operator's field of attention

This remains the app's visible operational identity.

### MT-08 — The Scale

Contained backend calibration intelligence:

`Weigh -> Allow -> Bind`

MT-08 answers:

- is the evidence sufficiently sourced
- are the reports independent or merely repeated
- how much conflict or uncertainty remains
- should the material be visible, held out, or admitted conditionally
- what normalized record may be constructed from it

This does not replace MT-07.
It supports what MT-07 is already doing.

## How MT-08 Fits The Existing App

### 1. Weigh

The app already measures candidate material against factors such as:

- source provenance
- publication recency
- geographic specificity
- independent corroboration
- infrastructure relevance
- conflict intensity
- narrative amplification
- duplicate-event probability

Today these judgments are distributed across normalization, clustering, field authority, and tape visibility logic.

MT-08 would give that activity one coherent name.

### 2. Allow

The app already decides what the current chamber may lawfully carry.

That appears today in:

- held-out clusters
- suppression reasons
- provisional visibility
- thin-sample recovery
- insufficient-basis states

MT-08 would not invent those refusals.
It would expose them as backend admission law.

### 3. Bind

The app already binds accepted material into normalized records, clusters, and dashboard bundles.

The key refinement is doctrinal:

Bind should mean:

`construct and lineage-seal the current admissible record`

It should not mean:

`declare the event absolutely true`

That distinction protects the app's uncertainty-honest character.

## Why The Admission Object Matters

The app currently implies admission logic, but does not expose it cleanly as a contract object.

A future admission object could look like:

```json
{
  "admission": {
    "admission_version": "1.0",
    "admission_status": "admitted_with_uncertainty",
    "lifecycle_status": "active",
    "source_count": 4,
    "source_family_count": 3,
    "measurements": {
      "corroboration": 0.73,
      "conflict": 0.31,
      "duplicate_risk": 0.18,
      "field_authority": 0.64
    },
    "decision_basis": [
      "independent_source_families_met",
      "scope_variance_unresolved",
      "duplicate_risk_below_threshold"
    ],
    "reason": "Multiple independent reports with unresolved scope variance",
    "ruleset": {
      "name": "mt08-admission",
      "version": "1.0"
    },
    "evaluated_at": "2026-06-22T00:00:00Z"
  },
  "lineage": {
    "application": "MT-07-SIGNAL",
    "governing_layer": "CARD-MT07",
    "calibration_layer": "CARD-MT08"
  }
}
```

This gives the app three stronger qualities:

- runtime state
- contract evidence
- doctrine lineage

That is stronger than a confidence score alone.

## Controlled Admission And Lifecycle Vocabulary

Admission and lifecycle should not be collapsed into one field.

Suggested `admission_status` vocabulary:

- `admitted`
- `admitted_with_uncertainty`
- `held_for_corroboration`
- `held_for_conflict`
- `rejected_as_duplicate`
- `rejected_for_insufficient_provenance`

Suggested `lifecycle_status` vocabulary:

- `active`
- `superseded`
- `expired`
- `withdrawn`

Suggested supporting fields:

- `admission_version`
- `decision_basis[]`
- `held_out_reason`
- `evaluated_at`
- `ruleset.name`
- `ruleset.version`

This keeps two dimensions separate:

- how the object entered
- what happened to it later

That creates replay and audit stability when the rules change.

## MT-08 Naming Split

To keep doctrine, runtime state, and audit history distinct, use a naming split instead of one overloaded label.

Suggested split:

- `MT-08 Loom Filter`
  - the overall backend doctrine and service boundary
- `Admission Profile`
  - the per-event decision object
- `Admission Ruleset`
  - the versioned measurements and thresholds
- `Admission Trace`
  - the replayable evidence-to-decision path

That keeps the Scale from becoming a vague umbrella term.

## The Hidden Assumption

This proposal assumes the current scoring and clustering outputs are stable enough to serve as evidence for admission.

That is probably workable.
But MT-08 should not merely rename a final score.

The evidence chain must be reconstructable under a named rule version.

It should preserve the chain:

`inputs -> measurements -> thresholds -> status -> explanation`

And, for replay and audit, the stronger form is:

`evidence snapshot -> measurements -> ruleset and threshold versions -> admission transition -> resulting record`

Without that, MT-08 becomes a storytelling label instead of a reproducible calibration chamber.

## The Irreversible Edge

The first irreversible edge appears when an MT-08 result is written into a canonical event bundle and treated as the admitted record.

Before that point, the system is still weighing.
After that point, the system has bound an operational object.

The transition sequence should be explicit:

`candidate -> weighed -> held | allowed -> bound -> superseded | expired`

Therefore:

Bind must mean:

`construct and lineage-seal the current admissible record`

not:

`declare the event absolutely true`

## MT-08 Water Admission

MT-08 can also lawfully host a secondary Water-style moderation function inside `Allow` without changing the app's Fire-governed calibration identity.

Water may help:

- preserve relations between conflicting reports
- moderate exaggerated narrative language
- retain uncertainty
- maintain source distinctions
- support reciprocity between evidence fields

Fire still governs frame, thresholds, and decision law.
Water moderates how differences remain visible inside admissible records.

MT-08 should not become a general empathy layer or a second visible app identity.

## Best Rollout Sequence

Do not start by changing the whole interface.

Use this order:

1. name the internal layer
2. add admission profiles
3. expose them in explain and audit
4. add held-out profiles
5. consider an optional operator drawer
6. keep the primary board visually MT-07

That is the cleanest implementation posture.

## What Not To Do

Do not:

- create a second loud app personality
- treat MT-08 as a new top-level visible board identity
- force card imagery into the runtime before the contract exists
- rename existing heuristics without exposing the underlying evidence chain
- pretend the current app already has a full MT-08 intake path if it does not

This matches existing repo caution around a future `MT-08`-like intake stage:

- meaningful later as a receiver-side contract
- not something to force into the current operator-facing board

## Final Architecture Statement

The MT-07 Signal App is a separate applied descendant of the Myth-Tech Delta Loom Deck.

`MT-07`, The Vector, governs signal direction, pressure, and operator attention.

`MT-08`, The Scale, operates quietly in the backend to weigh evidence, allow measured admission, and bind auditable event records.

The deck remains the source architecture.
The app remains its specialized operational instrument.

## Verdict

PASS, AS A LAYERING CLARIFICATION

Why:

- the proposal matches behavior the app already performs
- it strengthens doctrine without forcing a premature subsystem rewrite
- it creates a cleaner path for future admission-profile and explain-surface work

## Tree of Relief

First name the hidden scale, then let the carried line show what it has truly earned.
