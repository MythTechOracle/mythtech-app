import dotenv from "dotenv";
import { initDb, insertRawItems } from "../db/db.js";
import { fetchGdeltWindow } from "../connectors/gdeltConnector.js";

dotenv.config();
initDb();

export async function ingestGdelt() {
  const {
    items,
    errors,
    skipped = false,
    rate_limited = false,
    cooldown_until = null,
    basket_order = [],
    selected_baskets = [],
    baskets_per_cycle = 1,
    next_basket = null
  } = await fetchGdeltWindow();
  const inserted = insertRawItems(items);

  const result = {
    fetched: items.length,
    inserted,
    skipped,
    rate_limited,
    cooldown_until,
    basket_order,
    selected_baskets,
    baskets_per_cycle,
    next_basket,
    errors
  };

  console.log(JSON.stringify({
    task: "ingestGdelt",
    ...result
  }, null, 2));

  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ingestGdelt().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
