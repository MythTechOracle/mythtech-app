# MT-06: `B = 6`, `A = 4` Determinism Note

Source artifact:
- [B = 6, A = 4 — What That Actually Means.pdf](C:/Users/Neltron/Downloads/B%20=%206,%20A%20=%204%20%E2%80%94%20What%20That%20Actually%20Means.pdf)

Status:
- This artifact is narrow, but structurally complete on its question.
- It is not the whole MythTech Delta doctrine.
- It is a coherent explanation of one deterministic replay law inside the MT build.

## Core Reading

The artifact explains that:

- `B = 6` means the run has six beat-states.
- `A = 4` means each beat-state has four axes.
- Together they define a fixed `6 x 4` replay geometry.

In the artifact's own framing, this means the MT-06 envelope is no longer an open scenario. It becomes a sealed state-space with:

- six ordered beat positions
- four named dimensions per position
- explicit replay structure instead of inferred structure

That is the heart of the coherence claim.

## What `B = 6` Does

`B = 6` fixes the temporal span of the run.

The artifact ties this to six beats:

1. Spark
2. Aim
3. Design
4. Build
5. Iterate
6. Integrate

This gives replay a fixed step-count. The engine does not guess how many states belong to the run.

## What `A = 4` Does

`A = 4` fixes the dimensionality of each beat-state.

The artifact uses four axes:

1. Chaos
2. Order
3. Narrative
4. Time

This gives replay a fixed state-vector shape. Each beat carries exactly four values, in a declared order.

## Why This Matters

The artifact's real argument is about determinism contracts.

If `B` and `A` are left implicit:

- one implementation may assume one step-count
- another may assume a different step-count
- one implementation may assume one axis-shape
- another may assume a different axis-shape

That breaks reproducibility.

If `B = 6` and `A = 4` are sealed explicitly, replay becomes structurally constrained. The run can be traversed as the same `6 x 4` matrix every time, assuming the other required contract fields are also present.

## MT Reading

This is not primarily a mythic artifact.

It is a kernel-facing coherence artifact.

Its role in the MT build is to explain that replay determinism depends on fixed geometry:

- temporal determinism from `B`
- dimensional determinism from `A`

That makes it a strong fit for the more structural side of MythTech Delta:

- contract before interpretation
- shape before replay
- explicit geometry before narrative freedom

## Clean Summary

`B = 6` means six beat-states.

`A = 4` means four axes per state.

Together they produce a fixed `6 x 4` run geometry. That fixed geometry is what lets MT-06 move from an irreproducible or under-specified run into a deterministically replayable envelope.

## Tree of Relief

Six steps forward, four dimensions mapped. Once the path-length and shape are sealed, replay stops being guesswork and becomes lawfully reproducible.
