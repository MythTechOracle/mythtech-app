# MythTech Kernel to Signal App Adaptation Plan

Date: 2026-04-03

## Status

This plan maps the current MythTech kernel compression artifacts against the MT-07 Live Signals app.

The purpose is not to replace the app’s existing MT-07 field pipeline.
The purpose is to decide which kernel artifacts can be adapted:

- now
- later
- as docs only
- or not for runtime

## Governing Law

Use these artifacts as handoff and helper contracts around the Signal app, not as replacements for the app’s existing MT-07 field pipeline.

Companion line:

MT-07 is one state of the Loom, not the whole Loom.

## Current App Boundary

The current Signal app already has its own live operator path:

`text -> normalization -> incident form -> event geography -> cluster incident identity -> category -> escalation -> field authority -> visibility -> recovery/thin-sample honesty -> metrics -> audit`

That means kernel artifacts should be adapted carefully.

They may:

- wrap the app
- summarize the app
- receive app output
- support helper-lane handoff

They should not:

- replace normalization
- replace clustering
- replace scoring
- replace visibility logic
- replace operator-facing truth routes

## Artifact Map

### 1. `mythtech_kernel_digest.md`

Path:

- [mythtech_kernel_digest.md](C:/Users/Neltron/Downloads/mythtech_kernel_digest.md)

Disposition:

- `docs only`

Why:

- it is a builder-facing compression digest
- it explains handoff logic and canonical laws
- it is useful as doctrine and helper context
- it is not a runtime contract by itself

Best adaptation:

- use as repo-side reference material
- use as helper prompt/context material later
- cite it in future handoff-plan docs if the Signal app grows into broader Loom integration

### 2. `mythtech_kernel_compression.json`

Path:

- [mythtech_kernel_compression.json](C:/Users/Neltron/Downloads/mythtech_kernel_compression.json)

Disposition:

- `adopt later`

Why:

- it is structured enough to be machine-readable
- it contains compact laws, artifact roles, minimal contracts, and current evidence state
- it fits future helper-lane interpretation better than current board runtime

Best adaptation:

- use later as a helper-lane doctrine/context bundle
- use as a reference source for Agent SDK advisory outputs
- possibly adapt selected fields into a future MT-07/MT-08 handoff helper packet

Do not:

- inject it into `/api/dashboard`
- let it author current board truth

### 3. `mythtech_kernel_manifest.csv`

Path:

- [mythtech_kernel_manifest.csv](C:/Users/Neltron/Downloads/mythtech_kernel_manifest.csv)

Disposition:

- `docs only`

Why:

- it is an artifact inventory
- it is useful for provenance and bundle management
- it does not carry runtime decision logic

Best adaptation:

- keep as KB / handoff inventory
- use later if you want a formal kernel bundle registry for Signal app handoff packs

### 4. `mt07_result_envelope.min.schema.json`

Path:

- [mt07_result_envelope.min.schema.json](C:/Users/Neltron/Downloads/mt07_result_envelope.min.schema.json)

Disposition:

- `adopt now`

Why:

- it is the strongest fit for a Signal app sidecar export or handoff contract
- it already matches the idea of MT-07 emitting a governed result packet
- it can wrap current app state without replacing existing board payloads

Best adaptation:

- add a separate export or helper-facing envelope route later, for example:
  - `/api/handoff/mt07-envelope`
  - or a helper-side packet builder

Good current app mappings:

- `ts` <- `dashboard.meta.generated_at`
- `processor_id = MT-07`
- `event = result`
- `result.statement` <- derived from `tree_of_relief`
- `result.handoff_state` <- derived from current surface/sample readiness
- `result.next_handoff` <- `MT-08` or helper-lane receiver
- `result.brittleness_flag` <- derived from thinness, degradation, coherence weakness, held-out pressure
- `result.return_phase` <- current surface return phase / mode
- `result.self_audit_id` <- snapshot-generated id or snapshot selection id

Needs added or derived before full adoption:

- `packet_receipt.artifact_hash`
- `axis_net`
- `relief_tree_signature.checksum`
- optional `mirror_pass`

So the right move is:

- adopt as a sidecar contract
- do not replace `/api/dashboard`

### 5. `mt08_intake_packet.min.schema.json`

Path:

- [mt08_intake_packet.min.schema.json](C:/Users/Neltron/Downloads/mt08_intake_packet.min.schema.json)

Disposition:

- `adopt later`

Why:

- it is a receiver-side contract
- it fits a future helper-lane or broader Loom handoff better than the current app
- it becomes meaningful once there is a real downstream MT-08-like intake stage

Best adaptation:

- use later as the contract for:
  - helper-lane intake verification
  - Agent SDK advisory packet receipt
  - future MT-07 to MT-08 handoff experiments

Do not:

- force it into the current operator-facing board
- pretend the current app already has a real MT-08 intake path when it does not

### 6. `mythtech_kernel_compression_pack.zip`

Path:

- [mythtech_kernel_compression_pack.zip](C:/Users/Neltron/Downloads/mythtech_kernel_compression_pack.zip)

Disposition:

- `not for runtime`

Why:

- it is a bundle container, not a runtime contract
- it is useful for archive, handoff, and KB preservation
- it should stay outside the live app dependency graph

Best adaptation:

- keep as archival bundle
- reference it in future handoff docs if you need a KB-ready package source

## Recommended Adoption Order

### Now

1. `mt07_result_envelope.min.schema.json`
   - as a sidecar handoff/export contract

### Later

2. `mt08_intake_packet.min.schema.json`
   - when a real helper-lane or downstream intake path exists

3. `mythtech_kernel_compression.json`
   - as helper-lane doctrine/context input

### Docs Only

4. `mythtech_kernel_digest.md`
5. `mythtech_kernel_manifest.csv`

### Not For Runtime

6. `mythtech_kernel_compression_pack.zip`

## Best Current Repo Fit

These artifacts fit the repo best in three places:

### 1. Repo doctrine and planning

- checkpoint notes
- integration plans
- handoff design docs

### 2. Helper-lane context

- Claude Code read-only assistance
- future Agent SDK helper prompts
- audit and checkpoint suggestion context

### 3. Sidecar export contracts

- future MT-07 result envelope export
- future MT-08 intake experiments

They do **not** fit as direct replacements for:

- `server/services/normalizationService.js`
- `server/services/clusteringService.js`
- `server/services/scoringService.js`
- current dashboard payload contracts

## Concrete Next Move

The clean next step, if you want a real adaptation, is:

- map the current dashboard + trace state into a draft `mt07_result_envelope` builder
- keep it separate from `/api/dashboard`
- emit it only as a helper/handoff sidecar

That would be the first lawful adaptation from these kernel artifacts into the current custom Signal app build.

## Checkpoint Verdict

PASS

Why:

- the artifact roles separate cleanly
- one schema fits now as a sidecar
- one schema fits later as a receiver contract
- the rest fit as doctrine, inventory, or archive
- the current app’s MT-07 field path stays intact

## Anchor

Let the kernel travel around the Signal app as contract and handoff memory; do not let it overwrite the living field pipeline.
