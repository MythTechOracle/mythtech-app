# Escalation Pressure Checkpoint

Date: 2026-03-27

## Summary

This checkpoint uses the live board, the escalation explain surface, and the `/api/health/escalation-pressure` audit route together.

Current MT-07 line:

**The metric now has appearance, justification, and audit continuity.**

## Current Window Read

| Window | Value | Status | Visible tape clusters | Escalation contributors | Sample state |
| --- | --- | --- | --- | --- | --- |
| 6h | `0 / 100` | `contained` | 8 | 0 | sufficient |
| 24h | `35 / 100` | `watch` | 26 | 7 | sufficient |
| 72h | `35 / 100` | `watch` | 77 | 23 | sufficient |

Read plainly:

- The current 6-hour window is active and populated, but it is not carrying meaningful hardening pressure.
- The 24-hour and 72-hour windows both resolve to `watch`, which means the board is seeing real geopolitical hardening texture without inflating it into a crisis read.

## Top Contributing Clusters

### 24h

1. `9.50` — `Iran and US at impasse over ceasefire talks as Trump extends Hormuz deadline`
2. `1.97` — `Iran and US at impasse over ceasefire talks as fears grow of conflict escalation`
3. `1.22` — `Iran and US harden positions as Tehran keeps its grip on Strait of Hormuz`

### 72h

1. `9.50` — `Iran and US at impasse over ceasefire talks as Trump extends Hormuz deadline`
2. `7.00` — `Iran and US harden positions as Tehran keeps its grip on Strait of Hormuz`
3. `4.59` — `Strikes hit Iran as Tehran targets Israel and Gulf states`

## Top Explain Drivers

The live explain surface is now aligned with the requested window, so the card drawer and the audit route are saying the same thing.

### 24h explain drivers

1. `Iran and US at impasse over ceasefire talks as Trump extends Hormuz deadline (Cross-border action)`
2. `Iran and US at impasse over ceasefire talks as fears grow of conflict escalation (Cross-border action)`
3. `Iran and US harden positions as Tehran keeps its grip on Strait of Hormuz (Cross-border action)`

### 72h explain drivers

1. `Iran and US at impasse over ceasefire talks as Trump extends Hormuz deadline (Cross-border action)`
2. `Iran and US harden positions as Tehran keeps its grip on Strait of Hormuz (Cross-border action)`
3. `Strikes hit Iran as Tehran targets Israel and Gulf states (Cross-border action)`

## Contrast Examples

### Contained-window example

Current 6h contained example:

- `DDPAI étend sa disponibilité en Amérique du Nord avec le lancement sur Amazon Canada`

Why it stayed contained:

- infrastructure strain texture existed
- no state-linked, retaliatory, or cross-border hardening flags were present
- the audit route returned no escalation contributors for the 6-hour window

### Watch-window example

Current 24h and 72h watch example:

- `Iran and US at impasse over ceasefire talks as Trump extends Hormuz deadline`

Why it pushed the metric up:

- repeated cross-border hardening texture
- strong source-family support
- it remained a visible contributor in both the 24-hour and 72-hour windows

## Disruption vs Hardening

The current contrast pair remains clean:

- Strain without hardening:
  `Francis Scott Key Bridge collapse Two years later`
- Hardening without infrastructure dominance:
  `Iran and US at impasse over ceasefire talks as Trump extends Hormuz deadline`

That is the important behavior change. Infrastructure can remain visible without impersonating escalation.

## Checkpoint Read

This metric is now functioning as a governed layer instead of a loose score:

- appearance: the board surfaces `contained` versus `watch` in a way that tracks the live field
- justification: the explain drawer shows the specific clusters and drivers behind the read
- audit continuity: the health route reproduces the same logic across 6h, 24h, and 72h

## Verdict

`PASS`

The board can now distinguish disruption from geopolitical hardening, and it can show why that distinction exists.
