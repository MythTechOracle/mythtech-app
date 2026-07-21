import {
  loadRawItemsForWindow,
  normalizeDomain,
  saveProcessedEvents,
  saveMetricSnapshot,
  getLatestSnapshotSelection
} from "../db/db.js";
import { normalizeRawItems } from "./normalizationService.js";
import { buildClusters } from "./clusteringService.js";
import { scoreDashboardBundle } from "./scoringService.js";
import { getDashboardFixture, getExplainFixture, getHistoryFixture } from "../../src/live-signals/fixtures.js";

const ALLOWED_WINDOW_HOURS = new Set([6, 24, 72, 168]);

export function formatSnapshotWindowLabel(windowHours = 6) {
  return Number(windowHours) === 168 ? "7d" : `${Number(windowHours) || 6}h`;
}

export function parseSnapshotWindowHours(value, fallback = 6) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null || raw === "") {
    return fallback;
  }

  const match = String(raw).trim().toLowerCase().match(/^(\d+)\s*(h|hr|hrs|hour|hours|d|day|days)?$/);
  if (!match) {
    return fallback;
  }

  const amount = Number(match[1]);
  const unit = match[2] || "h";
  const hours = unit.startsWith("d") ? amount * 24 : amount;

  return ALLOWED_WINDOW_HOURS.has(hours) ? hours : fallback;
}

export function parseSnapshotRequest(query = {}) {
  const windowHours = parseSnapshotWindowHours(query.window_hours || query.hours || query.window, 6);
  return {
    window_hours: windowHours,
    window_label: formatSnapshotWindowLabel(windowHours),
    request_mode: windowHours === 6 ? "selected_snapshot" : "historical_rebuild"
  };
}

function isSnapshotEligibleRawItem(rawItem) {
  const acledShadowMode = String(process.env.ACLED_SHADOW_MODE || "true").toLowerCase() !== "false";
  if (acledShadowMode && rawItem?.source_type === "acled") {
    return false;
  }

  return true;
}

function buildFixtureFallbackBundle(windowStart, windowEnd, domain = "signals", options = {}) {
  const scopedDomain = normalizeDomain(domain);
  const windowHours = Number(options.windowHours || 6);
  const windowLabel = formatSnapshotWindowLabel(windowHours);
  const mode = options.mode || "live_api_fallback";
  const fixtureMode = options.fixtureMode ||
    (scopedDomain === "uap" || mode.startsWith("historical_rebuild") ? "empty" : "mock");
  const dashboard = structuredClone(getDashboardFixture(fixtureMode));
  dashboard.meta.generated_at = new Date().toISOString();
  dashboard.meta.domain = scopedDomain;
  dashboard.meta.window.start = windowStart;
  dashboard.meta.window.end = windowEnd;
  dashboard.meta.window.label = windowLabel;
  dashboard.meta.mode = mode;
  if (scopedDomain === "uap") {
    dashboard.banner = {
      ...dashboard.banner,
      title: "MT07 Anomaly Watch",
      subtitle: "Descriptive monitoring layer for anomaly claims, disclosure discourse, and correction-aware signal flow.",
      disclaimer: "This board monitors anomaly claims, provenance, and correction-aware signal flow. It does not determine metaphysical truth."
    };
    dashboard.composition = {
      ...dashboard.composition,
      title: "Field Composition"
    };
    dashboard.recent_events = {
      ...dashboard.recent_events,
      title: "Visible Anomaly Tape"
    };
    dashboard.notes = {
      ...dashboard.notes,
      items: ["No UAP-domain items were available for the active window."]
    };
    dashboard.method_snapshot = {
      ...dashboard.method_snapshot,
      items: [
        `Time window: rolling ${windowLabel}.`,
        "Claims remain descriptive until evidence support becomes stronger.",
        "This fallback surface is a safe continuity state, not a truth claim.",
        "Domain: UAP anomaly watch."
      ]
    };
  }
  dashboard.system_status = {
    ingestion: "degraded",
    notes: [
      scopedDomain === "uap"
        ? "Using empty fallback because no UAP-domain items were available for the active window."
        : "Using fixture fallback because no raw items were available for the active window."
    ]
  };

  return {
    dashboard,
    history: getHistoryFixture(fixtureMode),
    explain: getExplainFixture(fixtureMode)
  };
}

export async function buildSnapshot(windowHours = 6, domain = "signals", options = {}) {
  const scopedDomain = normalizeDomain(domain);
  const snapshotMode = options.mode || "live_api";
  const fallbackMode = options.fallbackMode || (snapshotMode === "live_api" ? "live_api_fallback" : `${snapshotMode}_fallback`);
  const persist = options.persist !== false;
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowHours * 60 * 60 * 1000);

  const rawItems = loadRawItemsForWindow(windowStart.toISOString(), windowEnd.toISOString(), scopedDomain)
    .filter(isSnapshotEligibleRawItem);
  if (rawItems.length === 0) {
    const fallbackBundle = buildFixtureFallbackBundle(
      windowStart.toISOString(),
      windowEnd.toISOString(),
      scopedDomain,
      { mode: fallbackMode, windowHours }
    );
    if (persist) {
      saveMetricSnapshot({
        domain: scopedDomain,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        mode: fallbackMode,
        payload: fallbackBundle
      });
    }
    return fallbackBundle;
  }

  const normalized = await normalizeRawItems(rawItems);
  const clusters = buildClusters(normalized);

  if (clusters.length === 0) {
    const fallbackBundle = buildFixtureFallbackBundle(
      windowStart.toISOString(),
      windowEnd.toISOString(),
      scopedDomain,
      { mode: fallbackMode, windowHours }
    );
    if (persist) {
      saveMetricSnapshot({
        domain: scopedDomain,
        windowStart: windowStart.toISOString(),
        windowEnd: windowEnd.toISOString(),
        mode: fallbackMode,
        payload: fallbackBundle
      });
    }
    return fallbackBundle;
  }

  if (persist) {
    saveProcessedEvents(
      clusters.map((cluster) => ({ ...cluster, domain: cluster.domain || scopedDomain })),
      windowStart.toISOString(),
      windowEnd.toISOString()
    );
  }

  const bundle = scoreDashboardBundle({
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    domain: scopedDomain,
    windowHours,
    rawItemCount: rawItems.length,
    clusters
  });

  bundle.dashboard.meta.mode = snapshotMode;

  if (persist) {
    saveMetricSnapshot({
      domain: scopedDomain,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      mode: snapshotMode,
      payload: bundle
    });
  }

  return bundle;
}

export async function getSnapshotBundleForRequest(query = {}, options = {}) {
  const domain = normalizeDomain(options.domain || query.domain || "signals");
  const request = parseSnapshotRequest(query);
  const isHistoricalRebuild = request.request_mode === "historical_rebuild";
  const bundle = isHistoricalRebuild
    ? await buildSnapshot(request.window_hours, domain, {
        persist: false,
        mode: "historical_rebuild"
      })
    : getSnapshotBundle({ domain }) || (await buildSnapshot(6, domain));

  return {
    bundle,
    request: {
      ...request,
      domain,
      persisted: !isHistoricalRebuild
    }
  };
}

export function getSnapshotBundle(options = {}) {
  const selection = getSnapshotSelection(options);
  const row = selection.selected_snapshot;
  return row ? JSON.parse(row.payload_json) : null;
}

export function getSnapshotSelection(options = {}) {
  const domain = normalizeDomain(typeof options === "string" ? options : options?.domain || "signals");
  return getLatestSnapshotSelection({
    liveMaxAgeMs: Number(process.env.LIVE_SNAPSHOT_MAX_AGE_MS || 15 * 60 * 1000),
    ...(typeof options === "object" && options ? options : {}),
    domain
  });
}
