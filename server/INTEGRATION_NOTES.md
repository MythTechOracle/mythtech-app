# Integration notes for the current app

Your current front end already fetches:
- `/api/dashboard`
- `/api/metrics/history`
- `/api/events`
- `/api/composition`
- `/api/explain/metric/:key`

This scaffold keeps those routes stable.

## Easiest local path

Keep your current front end untouched.

Run:
- `npm run db:init`
- `npm run ingest:once`
- `npm run snapshot:once`
- `npm run start:live`

Then keep the browser on `live_api` mode with `baseUrl=/api`.

## Next step after first green path

Once a single ingest + snapshot cycle is working, add a scheduler:
- ingest every 10 minutes
- snapshot every 5 minutes

That can live in a later `server/scheduler.js`.
