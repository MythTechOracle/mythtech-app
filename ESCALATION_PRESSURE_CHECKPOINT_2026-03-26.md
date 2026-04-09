# Escalation Pressure Checkpoint

Date: 2026-03-26

Anchor line:

**Infrastructure shows strain; escalation shows geopolitical hardening.**

MT-07 summary:

**The board can now distinguish disruption from hardening, instead of letting one impersonate the other.**

## Verdict

PASS

The metric is now live, bounded, explainable, and materially distinct from infrastructure strain. In the current data, infrastructure-heavy rows can remain visible without automatically driving Escalation Pressure upward, while cross-border hardening language pushes the metric in a controlled way.

## Window Values

| Window | Escalation Pressure | Status | Raw items | Processed clusters | Visible tape clusters | Sample state | Contributors |
| --- | --- | --- | ---: | ---: | ---: | --- | ---: |
| 6h | 35 / 100 | watch | 23 | 14 | 5 | sufficient | 3 |
| 24h | 34 / 100 | watch | 112 | 78 | 21 | sufficient | 5 |

## Top Contributing Clusters

### 6h

1. `cl_7414184b20ee`
   Iran and US at impasse over ceasefire talks as fears grow of conflict escalation
   `escalation_signal: 0.36 | confidence: 0.91 | source families: 6`
   Active drivers: cross-border action

2. `cl_7d3d493f311e`
   Iran and US harden positions as Tehran keeps its grip on Strait of Hormuz
   `escalation_signal: 0.35 | confidence: 0.87 | source families: 4`
   Active drivers: cross-border action

3. `cl_96d9ab6ca07b`
   The Latest Trump insists Iran is begging to make a deal after Tehran dismisses ceasefire plan Technology
   `escalation_signal: 0.29 | confidence: 0.79 | source families: 2`
   Active drivers: cross-border action

### 24h

1. `cl_3f8e6e85d91d`
   Iran and US harden positions as Tehran keeps its grip on Strait of Hormuz
   `escalation_signal: 0.35 | confidence: 0.87 | source families: 23`
   Active drivers: cross-border action

2. `cl_7414184b20ee`
   Iran and US at impasse over ceasefire talks as fears grow of conflict escalation
   `escalation_signal: 0.36 | confidence: 0.91 | source families: 6`
   Active drivers: cross-border action

3. `cl_c6ebbe25951f`
   Hezbollah Launches Record 85 Strikes, Targets Zionist Defense Ministry with Precision Missiles
   `escalation_signal: 0.29 | confidence: 0.73 | source families: 1`
   Active drivers: state actor presence, defense/security institution

## Top Explain Drivers

### 6h explain payload

- Cross-border action increased in the active window through repeated Iran/US and Hormuz-linked clusters.
- State-linked negotiation breakdown language remained visible, but not at hardening-level intensity.
- The contributing set stayed broad enough to avoid thin-sample damping.

### 24h explain payload

- Cross-border Iran/US hardening clusters remained the dominant pressure source.
- One state-linked security cluster added explicit institutional hardening texture.
- Infrastructure-only clusters stayed present without becoming major escalation contributors.

## Distinction Checks

### Example: infrastructure stayed high while escalation stayed low

`cl_e5f44605d3c0`

Francis Scott Key Bridge collapse Two years later

`category: infrastructure | confidence: 0.90 | source families: 5 | escalation_signal: 0.25`

Why this matters:

- visible and well-supported as an infrastructure cluster
- no state actor flag
- no cross-border flag
- no strategic-infrastructure-target flag

Result:

The row contributes to disruption/infrastructure texture, but it does not meaningfully impersonate geopolitical hardening.

Secondary infrastructure-low-escalation example:

`cl_859b376d7c51`
AEP explains 12-hour power outage in Corpus Christi after employee death

`confidence: 0.79 | source families: 2 | escalation_signal: 0.18`

### Example: cross-border language pushed escalation up

`cl_7414184b20ee`

Iran and US at impasse over ceasefire talks as fears grow of conflict escalation

`category: security | confidence: 0.91 | source families: 6 | escalation_signal: 0.36`

Why this matters:

- cross-border flag is active
- confidence and source-family support are strong
- field relevance is above baseline at `0.64`
- the cluster remains visible on the tape and meaningfully contributes to the metric

Result:

The board now reads this as geopolitical hardening pressure rather than generic disruption.

## Notes

- Current live windows are landing in `watch`, not `elevated` or `hardening`.
- In the present run, the metric is being driven mostly by cross-border pressure rather than retaliation or mobilization language.
- The distinction is working even before a dedicated escalation audit route exists.

## Next Watch List

- Watch for windows where retaliation, ceasefire breakdown, sanctions, or mobilization flags become the dominant explain drivers.
- Compare future infrastructure-heavy windows against the current checkpoint to confirm that infrastructure strain remains decoupled from escalation.
- If needed later, add a dedicated escalation audit/checkpoint route instead of relying only on the explain bundle.
