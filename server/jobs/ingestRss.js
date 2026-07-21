import dotenv from "dotenv";
import { initDb, insertRawItems, normalizeDomain } from "../db/db.js";
import { buildRssRuntimeConfig, fetchRssWindow } from "../connectors/rssConnector.js";

dotenv.config();
initDb();

export async function ingestRss(options = {}) {
  const domainFilter = options?.domain ? normalizeDomain(options.domain) : null;
  const baseConfig = buildRssRuntimeConfig(process.env);
  const config = domainFilter
    ? {
        ...baseConfig,
        feeds: baseConfig.feeds.filter((feed) => normalizeDomain(feed.domain || "signals") === domainFilter)
      }
    : baseConfig;

  if (!config.enabled) {
    console.log("[rss] disabled");
    return { fetched: 0, inserted: 0, skipped: true, reason: "disabled", feed_results: [], errors: [] };
  }

  const result = await fetchRssWindow(config);
  const inserted = insertRawItems(result.items);

  console.log(JSON.stringify({
    task: "ingestRss",
    domain: domainFilter,
    observed_at: result.observed_at,
    fetched: result.items.length,
    inserted,
    feed_count: config.feeds.length,
    feed_results: result.feed_results,
    errors: result.errors
  }, null, 2));

  return {
    fetched: result.items.length,
    inserted,
    domain: domainFilter,
    skipped: result.skipped,
    reason: result.reason,
    feed_results: result.feed_results,
    errors: result.errors
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ingestRss().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
