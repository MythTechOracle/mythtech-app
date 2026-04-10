# Escalation Pressure Short Checkpoint

Date: 2026-03-27

Anchor line:

**The metric now has appearance, justification, and audit continuity.**

MT-07 summary:

**The board now distinguishes strain, hardening, and proof of hardening as separate layers of appearance.**

## Current Window Read

| Window | Value | Status | Visible tape clusters | Escalation contributors | Sample state |
| --- | --- | --- | ---: | ---: | --- |
| 6h | `0 / 100` | `contained` | 8 | 0 | sufficient |
| 24h | `35 / 100` | `watch` | 26 | 7 | sufficient |
| 72h | `35 / 100` | `watch` | 78 | 23 | sufficient |

## What the Metric Is Doing

- The current `6h` window is genuinely contained: visible tape exists, but none of the visible clusters qualify as escalation contributors.
- The `24h` and `72h` windows are both at `watch`, with the score being driven by repeated Iran/US and Hormuz-linked cross-border clusters rather than by infrastructure strain.
- The audit route and explain surface now agree on the score and the reasons behind it.

## Top Contributing Clusters

### 24h

1. `cl_27d565e1b68e`
   Iran and US at impasse over ceasefire talks as Trump extends Hormuz deadline
   `escalation_signal: 0.36 | source families: 29 | contribution: 9.50`

2. `cl_7414184b20ee`
   Iran and US at impasse over ceasefire talks as fears grow of conflict escalation
   `escalation_signal: 0.36 | source families: 6 | contribution: 1.97`

3. `cl_83632eadeb6c`
   Iran and US harden positions as Tehran keeps its grip on Strait of Hormuz
   `escalation_signal: 0.35 | source families: 6 | contribution: 1.83`

### 72h

1. `cl_27d565e1b68e`
   Iran and US at impasse over ceasefire talks as Trump extends Hormuz deadline
   `escalation_signal: 0.36 | source families: 29 | contribution: 9.50`

2. `cl_3f8e6e85d91d`
   Iran and US harden positions as Tehran keeps its grip on Strait of Hormuz
   `escalation_signal: 0.35 | source families: 23 | contribution: 7.00`

3. `cl_e0e765923997`
   Strikes hit Iran as Tehran targets Israel and Gulf states
   `escalation_signal: 0.36 | source families: 14 | contribution: 4.59`

## Top Explain Drivers

### 24h

- Iran and US at impasse over ceasefire talks as Trump extends Hormuz deadline `(Cross-border action)` `9.50`
- Iran and US at impasse over ceasefire talks as fears grow of conflict escalation `(Cross-border action)` `1.97`
- Iran and US harden positions as Tehran keeps its grip on Strait of Hormuz `(Cross-border action)` `1.83`

### 72h

- Iran and US at impasse over ceasefire talks as Trump extends Hormuz deadline `(Cross-border action)` `9.50`
- Iran and US harden positions as Tehran keeps its grip on Strait of Hormuz `(Cross-border action)` `7.00`
- Strikes hit Iran as Tehran targets Israel and Gulf states `(Cross-border action)` `4.59`

## Contained-Window Example

**Current 6h window**

- Score: `0 / 100`
- Status: `contained`
- Visible tape clusters: `8`
- Escalation contributors: `0`

Meaning:

The board is active, but the current visible field does not contain enough state-linked, cross-border, retaliatory, or strategic-hardening texture to raise Escalation Pressure above containment.

Contained-window strain example:

`cl_bbac3b30e2a2`
DDPAI étend sa disponibilité en Amérique du Nord avec le lancement sur Amazon Canada

`category: infrastructure | escalation_signal: 0.11 | suppressed: single_family_low_confidence`

This is strain/noise texture, not hardening texture.

## Watch-Window Example

**Current 24h window**

- Score: `35 / 100`
- Status: `watch`
- Escalation contributors: `7`

Representative hardening example:

`cl_27d565e1b68e`
Iran and US at impasse over ceasefire talks as Trump extends Hormuz deadline

`category: security | escalation_signal: 0.36 | source families: 29`

Why it matters:

- repeated multi-family support
- cross-border flag active
- field relevance above baseline at `0.64`
- clearly driving escalation without depending on infrastructure strain

## Distinction Check

Strain without hardening:

`cl_e5f44605d3c0`
Francis Scott Key Bridge collapse Two years later

`category: infrastructure | confidence: 0.90 | source families: 11 | escalation_signal: 0.25`

No state-actor, cross-border, or strategic-target flags are active.

Hardening without infrastructure dominance:

`cl_27d565e1b68e`
Iran and US at impasse over ceasefire talks as Trump extends Hormuz deadline

`category: security | confidence: 0.91 | source families: 29 | escalation_signal: 0.36`

Cross-border pressure is active, and the score is being earned through geopolitical hardening rather than generic disruption.

## Checkpoint Conclusion

The metric is now legible at three levels:

- appearance on the board
- justification in the explain surface
- continuity in the audit route

That is the current milestone:

**Escalation Pressure is no longer just visible. It is inspectable, contrastable, and stable enough to govern.**
