import dotenv from "dotenv";
import { initDb, insertRawItems } from "../db/db.js";
import { buildAcledRuntimeConfig, fetchAcledPages } from "../connectors/acledConnector.js";

dotenv.config();
initDb();

export async function ingestAcled() {
  if (String(process.env.ACLED_ENABLED).toLowerCase() !== "true") {
    console.log("[acled] disabled");
    return { inserted: 0, errors: ["disabled"] };
  }

  const config = buildAcledRuntimeConfig(process.env);

  if (!config.token) {
    throw new Error("ACLED_ENABLED=true but ACLED_TOKEN is missing");
  }

  const result = await fetchAcledPages(config);
  const inserted = insertRawItems(result.raw_items);

  console.log(JSON.stringify({
    task: "ingestAcled",
    observed_at: result.observed_at,
    fetched: result.row_count,
    inserted,
    page_count: result.page_count,
    start_timestamp: config.startTimestamp,
    end_timestamp: config.endTimestamp,
    countries: config.countries,
    event_types: config.eventTypes
  }, null, 2));

  return {
    inserted,
    fetched: result.row_count,
    page_count: result.page_count
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ingestAcled().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
