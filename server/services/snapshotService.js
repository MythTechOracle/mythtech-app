import {
  loadRawItemsForWindow,
  saveProcessedEvents,
  saveMetricSnapshot,
  getLatestSnapshotSelection
} from "../db/db.js";
import { normalizeRawItems } from "./normalizationService.js";
import { buildClusters } from "./clusteringService.js";
import { scoreDashboardBundle } from "./scoringService.js";
import { getDashboardFixture, getExplainFixture, getHistoryFixture } from "../../src/live-signals/fixtures.js";

function isSnapshotEligibleRawItem(rawItem) {
  const acledShadowMode = String(process.env.ACLED_SHADOW_MODE || "true").toLowerCase() !== "false";
  if (acledShadowMode && rawItem?.source_type === "acled") {
    return false;
  }

  return true;
}

function buildFixtureFallbackBundle(windowStart, windowEnd) {
  const dashboard = getDashboardFixture("mock");
  dashboard.meta.generated_at = new Date().toISOString();
  dashboard.meta.window.start = windowStart;
  dashboard.meta.window.end = windowEnd;
  dashboard.meta.mode = "live_api_fallback";
  dashboard.system_status = {
    ingestion: "degraded",
    notes: ["Using fixture fallback because no raw items were available for the active window."]
  };

  return {
    dashboard,
    history: getHistoryFixture("mock"),
    explain: getExplainFixture("mock")
  };
}

export async function buildSnapshot(windowHours = 6) {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowHours * 60 * 60 * 1000);

  const rawItems = loadRawItemsForWindow(windowStart.toISOString(), windowEnd.toISOString())
    .filter(isSnapshotEligibleRawItem);
  if (rawItems.length === 0) {
    const fallbackBundle = buildFixtureFallbackBundle(windowStart.toISOString(), windowEnd.toISOString());
    saveMetricSnapshot({
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      mode: "live_api_fallback",
      payload: fallbackBundle
    });
    return fallbackBundle;
  }

  const normalized = await normalizeRawItems(rawItems);
  const clusters = buildClusters(normalized);

  if (clusters.length === 0) {
    const fallbackBundle = buildFixtureFallbackBundle(windowStart.toISOString(), windowEnd.toISOString());
    saveMetricSnapshot({
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      mode: "live_api_fallback",
      payload: fallbackBundle
    });
    return fallbackBundle;
  }

  saveProcessedEvents(clusters, windowStart.toISOString(), windowEnd.toISOString());

  const bundle = scoreDashboardBundle({
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    clusters
  });

  saveMetricSnapshot({
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    mode: "live_api",
    payload: bundle
  });

  return bundle;
}

export function getSnapshotBundle() {
  const selection = getSnapshotSelection();
  const row = selection.selected_snapshot;
  return row ? JSON.parse(row.payload_json) : null;
}

export function getSnapshotSelection(options = {}) {
  return getLatestSnapshotSelection({
    liveMaxAgeMs: Number(process.env.LIVE_SNAPSHOT_MAX_AGE_MS || 15 * 60 * 1000),
    ...options
  });
}
