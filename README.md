# MythTech App

Production build of the MythTech interactive UI. Deployed via GitHub Pages and embedded on ten-pointformatstyle.com (Wix).

## Runtime Loop Canon

The system loop is expressed in three phases:

### 1) MOURN
`observe → compute Δentropy → write residue → (seal optional)`

- **observe**: ingest current state and environment signals.
- **compute Δentropy**: measure information drift since the prior committed state.
- **write residue**: persist diagnostics/artifacts from the transition attempt.
- **seal (optional)**: cryptographically or operationally finalize residue when required.

### 2) FRAME
`select constraints → check invariants → if fail: rollback + residue`

- **select constraints**: bind the active policy, safety, and domain rules.
- **check invariants**: validate system truths that must always hold.
- **if fail**: revert to last known-good state and emit residue for analysis.

### 3) WEAVE
`apply lawful delta → commit next_state → emit telemetry → loop`

- **apply lawful delta**: apply only changes permitted by current constraints.
- **commit next_state**: atomically persist the resulting state.
- **emit telemetry**: publish metrics/events for observability.
- **loop**: continue to the next cycle.

## Pseudocode

```text
while running:
  MOURN()
  if not FRAME():
    rollback()
    continue
  WEAVE()
```
