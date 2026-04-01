# Live Signals App

This repo contains the current MT-07 Live Signals app: a local operator surface where MT-07 governs how wording becomes visible state, metrics, and audit.

## What It Includes

- the front-end board under `src/`
- the local host shell path and PowerShell entry scripts
- the Node/Express backend under `server/`
- ingest and snapshot scripts under `scripts/`
- SQLite persistence for raw intake, processed incidents, and snapshot bundles

## MT-07 Governing Spine

The current app follows this order:

`text -> normalization -> incident form -> event geography -> cluster incident identity -> category -> escalation -> field authority -> visibility -> recovery/thin-sample honesty -> metrics -> audit`

External feeds never touch the board directly. They pass through connectors, normalization, clustering, scoring, snapshot selection, and route delivery before the operator surface sees them.

## Current Surface Modes

- `live_api`: current backend-governed snapshot path
- `degraded`: curated fallback fixture with a five-row tape for continuity
- `mock`: broader synthetic fixture set for UI and metric testing
- `empty`: explicit no-surface fixture state for honesty and edge-case testing

## Current Backend Capabilities

- basket-driven GDELT-first ingest path with optional ACLED support
- SQLite-backed persistence
- incident-aware normalization with source-family logic, translation-aware comparison text, and event-geometry separation
- weighted clustering with cross-category incident merging where incident identity is strong
- field relevance, thin-sample honesty, and provisional surface recovery
- Escalation Pressure metric with explain surface and temporal read
- event-geometry alias handling and phrase-aware target/origin resolution

## Local API Contract

The current front end is matched to:

- `/api/dashboard?window=6h`
- `/api/metrics/history?window=6h&compare=24h,7d`
- `/api/composition?window=6h`
- `/api/events?...`
- `/api/explain/metric/:key`
- `/api/health/cluster-quality?...`
- `/api/health/escalation-pressure?...`

## Quickstart

1. Run `npm install`.
2. Copy `.env.example` to `.env` and set the values you want.
3. Run `npm run db:init`.
4. Run `npm run ingest:once`.
5. Run `npm run snapshot:once`.
6. Run `npm run start:live`.
7. Point the front end at `/api`.

## Notes

- The app is local-lab oriented but no longer just a scaffold.
- The route layer stays stable by serving one snapshot bundle JSON object with `dashboard`, `history`, and `explain`.
- MT-07 wording contract checkpoint: [MT07_WORDING_V1_2_CHECKPOINT_2026-03-28.md](./MT07_WORDING_V1_2_CHECKPOINT_2026-03-28.md)
