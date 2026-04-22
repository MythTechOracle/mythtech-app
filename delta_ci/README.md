# Delta CI Replay Lane

This folder is the repo-local sidecar lane for replay determinism work around the MT build.

It preserves the golden structure the verifier expects:

```text
delta_ci/
├── golden/
│   ├── boundary_reflect_kernel.json
│   ├── boundary_reflect_triad21.json
│   └── boundary_reflect_triad22.json
├── session/
│   └── session.json
├── verify_out/
│   ├── session_replay_verify_report.json
│   └── session_replay_verify_diffs.csv
└── delta_session_replay_verifier.mjs
```

## Current Build Boundary

This lane is intentionally sidecar-only.

The current MT-07 app already exposes:

- `/api/dashboard`
- `/api/handoff/mt07-envelope`
- `/api/handoff/mt07-kernel-session`
- helper and audit reads around the current surface

The new MT-07 adapter route emits a **draft kernel-style session packet** built from lawful MT-side sources:

- selected snapshot bundle
- snapshot selection policy and mode
- trace/sample-state context
- history series metrics

It produces a verifier-compatible packet shape with fields like:

- `kernel_id`
- `beats_total`
- `axes`
- `series[]` with beatwise `axes_in`, `axes_blend`, `axes_post_mirror`, `axes_final`, gate status, mirror flags, and seal indices

## What This Lane Does Now

- holds the verifier in repo-local form
- gives the build a stable place for golden reference runs
- makes it easy to verify recovered or future sealed kernel packets
- provides a draft MT-07-to-kernel adapter route and export script

## What This Lane Does Not Do Yet

It does **not** mean:

- MT-07 board truth is being replaced
- `/api/handoff/mt07-envelope` and `/api/handoff/mt07-kernel-session` are equivalent artifacts
- helper lanes can author kernel truth
- the draft adapter is now a sealed kernel authority

MT-07 remains sovereign over live field truth.

This lane is for replay law, sidecar verification, and recovered kernel artifacts.

## Commands

### Export MT-07 adapter packet into `delta_ci/session`

```powershell
node .\scripts\export-mt07-kernel-session.js `
  --out .\delta_ci\session\session.json
```

### Read adapter packet from API

```powershell
curl http://localhost:8787/api/handoff/mt07-kernel-session
```

### Strict compare

```powershell
node .\delta_ci\delta_session_replay_verifier.mjs `
  --candidate .\delta_ci\session\sealed_kernel_run.json `
  --reference .\delta_ci\golden\boundary_reflect_kernel.json `
  --out_dir .\delta_ci\verify_out
```

### Live prefix compare

```powershell
node .\delta_ci\delta_session_replay_verifier.mjs `
  --candidate .\delta_ci\session\session.json `
  --reference .\delta_ci\golden\boundary_reflect_kernel.json `
  --allow_candidate_prefix `
  --out_dir .\delta_ci\verify_out
```

### Downstream-only compare

```powershell
node .\delta_ci\delta_session_replay_verifier.mjs `
  --candidate .\delta_ci\session\session.json `
  --reference .\delta_ci\golden\boundary_reflect_kernel.json `
  --allow_candidate_prefix `
  --downstream_only `
  --out_dir .\delta_ci\verify_out
```

## Recommended Next Hardening

The adapter is now wired, but still draft.

The strongest next hardening steps are:

1. Promote a canonical golden `boundary_reflect_kernel.json` into `delta_ci/golden`.
2. Add explicit axis-net and mirror-pass receipts when those sidecars become available.
3. Add a route-level note in main docs that this packet is replay-law sidecar output only.
4. Keep this lane sidecar-only until adapter fields are validated against sealed references across multiple windows.
