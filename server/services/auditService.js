import {
  loadRawItemsForWindow,
  getLatestSnapshotSelection
} from "../db/db.js";
import { normalizeRawItems } from "./normalizationService.js";
import { buildClusters } from "./clusteringService.js";
import { categoryOrder } from "../config/categories.js";

function emptyCounts() {
  return Object.fromEntries(categoryOrder.map((key) => [key, 0]));
}

function increment(map, key) {
  if (!key) return;
  map[key] = (map[key] || 0) + 1;
}

function toIsoWindow(windowHours = 6) {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowHours * 60 * 60 * 1000);
  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString()
  };
}

function summarizeBasketCounts(rawItems = []) {
  const counts = {};
  for (const item of rawItems) {
    increment(counts, item.query_basket || "unassigned");
  }
  return counts;
}

function summarizeNormalizedCategoryCounts(normalizedRows = []) {
  const counts = emptyCounts();
  for (const row of normalizedRows) {
    increment(counts, row.category || "information");
  }
  return counts;
}

function summarizeClusterCategoryCounts(clusters = []) {
  const counts = emptyCounts();
  for (const cluster of clusters) {
    increment(counts, cluster.category || "information");
  }
  return counts;
}

function hiddenZeroCategories(clusterCounts = {}) {
  return categoryOrder.filter((key) => Number(clusterCounts[key] || 0) === 0);
}

function compactLatestSnapshot(row) {
  if (!row) return null;
  return {
    id: row.id,
    window_start: row.window_start,
    window_end: row.window_end,
    generated_at: row.generated_at,
    mode: row.mode
  };
}

export async function buildHealthDetail(windowHours = 6) {
  const { windowStart, windowEnd } = toIsoWindow(windowHours);
  const rawItems = loadRawItemsForWindow(windowStart, windowEnd);
  const normalizedRows = await normalizeRawItems(rawItems);
  const clusters = buildClusters(normalizedRows);
  const selection = getLatestSnapshotSelection({
    liveMaxAgeMs: Number(process.env.LIVE_SNAPSHOT_MAX_AGE_MS || 15 * 60 * 1000)
  });

  const basketCounts = summarizeBasketCounts(rawItems);
  const normalizedCategoryCounts = summarizeNormalizedCategoryCounts(normalizedRows);
  const clusterCategoryCounts = summarizeClusterCategoryCounts(clusters);

  return {
    ok: true,
    window_hours: windowHours,
    window_start: windowStart,
    window_end: windowEnd,
    latest_snapshot: compactLatestSnapshot(selection.latest_snapshot),
    latest_live_snapshot: compactLatestSnapshot(selection.latest_live_snapshot),
    selected_snapshot: compactLatestSnapshot(selection.selected_snapshot),
    selection_policy: selection.selection_policy,
    live_max_age_ms: selection.live_max_age_ms,
    raw_item_count: rawItems.length,
    processed_cluster_count: clusters.length,
    basket_counts: basketCounts,
    normalized_category_counts: normalizedCategoryCounts,
    cluster_category_counts: clusterCategoryCounts,
    hidden_zero_categories: hiddenZeroCategories(clusterCategoryCounts),
    notes: [
      "basket_counts show what came in from the connector layer.",
      "normalized_category_counts show what the classifier assigned before clustering.",
      "cluster_category_counts show what survived as event clusters.",
      "hidden_zero_categories lists taxonomy lanes currently absent from the clustered window."
    ]
  };
}
