import dotenv from "dotenv";
import { initDb } from "../server/db/db.js";
import { buildSnapshot } from "../server/services/snapshotService.js";

dotenv.config();
initDb();

const bundle = await buildSnapshot(6);

console.log(JSON.stringify({
  task: "buildSnapshot",
  generated_at: bundle.dashboard.meta.generated_at,
  metric_count: bundle.dashboard.metrics.cards.length,
  event_count: bundle.dashboard.recent_events.items.length
}, null, 2));
