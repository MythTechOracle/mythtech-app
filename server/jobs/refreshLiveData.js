import dotenv from "dotenv";
import { ingestGdelt } from "./ingestGdelt.js";
import { ingestRss } from "./ingestRss.js";
import { ingestAcled } from "./ingestAcled.js";
import { buildSnapshot } from "../services/snapshotService.js";

dotenv.config();

function isRssEnabled(env = process.env) {
  return String(env.RSS_ENABLED || "false").toLowerCase() === "true";
}

function isAcledEnabled(env = process.env) {
  return String(env.ACLED_ENABLED || "false").toLowerCase() === "true";
}

function isEventRegistryEnabled(env = process.env) {
  return String(env.EVENT_REGISTRY_ENABLED || "false").toLowerCase() === "true";
}

export async function runRefreshLiveData() {
  const startedAt = new Date().toISOString();
  const gdelt = await ingestGdelt();
  const rss = isRssEnabled()
    ? await ingestRss()
    : { fetched: 0, inserted: 0, skipped: true, reason: "disabled", feed_results: [], errors: [] };
  const acled = isAcledEnabled()
    ? await ingestAcled()
    : { skipped: true, reason: "disabled" };
  const eventRegistry = isEventRegistryEnabled()
    ? { skipped: true, reason: "not_implemented_shadow_lane" }
    : { skipped: true, reason: "disabled" };
  const bundle = await buildSnapshot(6);

  const result = {
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    gdelt: {
      fetched: gdelt.fetched,
      inserted: gdelt.inserted,
      skipped: gdelt.skipped || false,
      rate_limited: gdelt.rate_limited || false,
      cooldown_until: gdelt.cooldown_until || null,
      basket_order: gdelt.basket_order || [],
      selected_baskets: gdelt.selected_baskets || [],
      baskets_per_cycle: gdelt.baskets_per_cycle || 1,
      next_basket: gdelt.next_basket || null,
      errors: gdelt.errors || [],
    },
    rss: {
      fetched: rss.fetched || 0,
      inserted: rss.inserted || 0,
      skipped: rss.skipped || false,
      reason: rss.reason || null,
      feed_results: rss.feed_results || [],
      errors: rss.errors || []
    },
    acled,
    event_registry: eventRegistry,
    snapshot: {
      generated_at: bundle.dashboard.meta.generated_at,
      mode: bundle.dashboard.meta.mode,
      window_start: bundle.dashboard.meta.window.start,
      window_end: bundle.dashboard.meta.window.end,
      event_count: bundle.dashboard.recent_events.items.length,
      metric_count: bundle.dashboard.metrics.cards.length,
    },
  };

  console.log(JSON.stringify({
    task: "refreshLiveData",
    ...result,
  }, null, 2));

  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runRefreshLiveData().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
