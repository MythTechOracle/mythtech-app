import dotenv from "dotenv";
import { initDb } from "../db/db.js";
import { buildSnapshot } from "../services/snapshotService.js";

dotenv.config();
initDb();

async function run() {
  const bundle = await buildSnapshot(6);
  console.log(JSON.stringify({
    task: "buildSnapshot",
    generated_at: bundle.dashboard.meta.generated_at,
    metric_count: bundle.dashboard.metrics.cards.length,
    event_count: bundle.dashboard.recent_events.items.length
  }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
