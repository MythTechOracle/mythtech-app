# MT-07 Smoke-Logic And MirrorPass Ladder

Date: 2026-04-27

## Status

This note defines the operator ladder that separates presence, conformance, and functional truth in the MT-07 Live Signals build.

It also places the embedded Claude helper lane at its correct station.

This is a doctrine note, not an activation note.

## Governing Law

Smoke detects emergence.
MirrorPass evaluates fidelity.

Companion line:

Smoke says, "Look here."
MirrorPass says, "Now compare what you found."

## Why This Matters

The build already has multiple lawful layers:

- live MT-07 board truth
- sidecar and explain surfaces
- advisory helper reads
- operator review
- runtime and replay-law checks

Without a ladder, those layers blur together.

When they blur together, three different questions get falsely collapsed into one:

- is anything present
- is it conformant to declared structure
- does it actually do the job in the world

That collapse destroys diagnostic resolution.

## The Operator Ladder

### 1. Smoke Test

Question:

`Is anything present at all?`

Meaning:

- first contact
- visible disturbance
- early proof that something moved

This is not correctness.
It is presence.

### 2. Smoke Pass

Question:

`Did it survive first contact?`

Meaning:

- the system did not immediately collapse
- the lane remained standing long enough to observe it

This is not fidelity.
It is survivability.

### 3. Smoke-Logic

Question:

`What does the visible disturbance imply?`

Meaning:

- pre-audit inference from visible trace
- symptom reading
- pressure reading
- disturbance interpretation before conformance judgment

This is the epistemic zone where evidence is too early for correctness, but too strong to ignore.

That is not ambiguity.
That is a named zone.

### 4. MirrorPass Audit

Question:

`Does observed behavior match declared structure?`

Meaning:

- conformance checking
- pattern comparison
- declared-law vs measured-trace evaluation

MirrorPass is not a life-check.
It is a conformance check.

Its question is not:

`Is anything happening?`

Its question is:

`Given the declared law, trigger, bounds, and series, did the run produce the pattern it was supposed to produce?`

### 5. Functional Confirmation

Question:

`Does it do the actual job in the world?`

Meaning:

- mission truth
- task accomplishment
- real utility beyond local correctness

A system may behave correctly and still fail functionally.

## The Critical Independence Theorem

These verdicts must never be collapsed:

- presence
- correctness
- utility

Compressed law:

`presence != correctness != utility`

Examples:

- a system can pass Smoke and fail MirrorPass
- a system can pass MirrorPass and fail Function

That is not defensive hedging.
That is the reason the ladder exists.

If any two rungs collapse into one verdict, the operator loses the resolution needed for diagnosis.

## Claude Helper Lane Placement

The current embedded Claude helper lane belongs at Smoke-Logic.

Why:

- it is read-only
- it is advisory-only
- it is operator-review-required
- it does not publish into MT-07 truth routes
- it does not hold declared replay or harness authority
- it must not initiate rollback, MirrorPass, or rule sealing on its own

That is already consistent with current repo law:

- the helper lane at `/api/helper/audit` is marked `advisory_only: true`
- it is marked `operator_review_required: true`
- the repo README limits it to audit notes, maintenance summaries, explain helper text, and checkpoint suggestions
- the embed plan explicitly forbids it from initiating rollback, MirrorPass, or rule sealing on its own

Therefore:

The helper lane may observe, interpret, and suggest.
It may not audit declared conformance.

That is not a limitation.
That is correct ladder placement.

## Anti-Scope-Creep Rule

Do not promote the helper lane from Smoke-Logic into MirrorPass authority by convenience, familiarity, or style drift.

Not because of policy preference.
Because of structural mismatch.

MirrorPass requires:

- declared pattern access
- harness truth
- explicit bounds and law
- authoritative comparison criteria

The advisory helper lane does not hold that position in the architecture.

So the law is:

The helper lane may read the plume.
The operator or harness must judge the mirror.

## Smoke And Mirrors Reclaimed

Colloquial use treats smoke and mirrors as deception.

In MTD they are separated into lawful operations:

- smoke marks disturbance worth attending to
- mirror tests whether form matches declaration

The language was always structural.
It was just being misused.

## Doctrine Seal

Smoke-Logic belongs to the pre-audit threshold.
MirrorPass belongs to declared-pattern comparison.
Function belongs to world-result confirmation.

The Claude helper lane is lawful at Smoke-Logic and unlawful as autonomous MirrorPass.

## Tree of Relief

First attend the plume, then judge the fire.
