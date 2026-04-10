import { loadRawItemsForWindow } from "../db/db.js";
import { normalizeRawItems } from "./normalizationService.js";
import { buildClusters } from "./clusteringService.js";
import { buildSurfaceSelection, scoreClustersForTape } from "./scoringService.js";

function toIsoWindow(windowHours = 6) {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowHours * 60 * 60 * 1000);
  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString()
  };
}

function average(values = []) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function countBy(values = []) {
  const counts = new Map();

  for (const value of values) {
    const key = String(value || "unknown");
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => ({ label, count }));
}

function sampleCluster(cluster) {
  return {
    cluster_id: cluster.cluster_id,
    event_time: cluster.event_time,
    region: cluster.region,
    country: cluster.country || null,
    category: cluster.category,
    observed_update: cluster.observed_update,
    severity: cluster.severity,
    confidence: cluster.confidence,
    source_count: cluster.source_count,
    source_family_count: cluster.source_family_count,
    event_likeness: cluster.event_likeness,
    field_relevance: cluster.field_relevance,
    signal_strength: cluster.signal_strength,
    contains_translated_item: Boolean(cluster.contains_translated_item),
    visibility_state: cluster.provisional_visibility ? "provisional" : "authoritative",
    visibility_note: cluster.provisional_visibility
      ? "Provisional visibility under thin-sample recovery."
      : "",
    suppression_reasons: cluster.suppression_reasons || [],
    source_families: (cluster.source_families || []).slice(0, 4)
  };
}

export async function buildClusterQuality(windowHours = 6) {
  const { windowStart, windowEnd } = toIsoWindow(windowHours);
  const rawItems = loadRawItemsForWindow(windowStart, windowEnd);
  const normalizedRows = await normalizeRawItems(rawItems);
  const clusters = buildClusters(normalizedRows);
  const scoredClusters = scoreClustersForTape(clusters);
  const surfaceSelection = buildSurfaceSelection(scoredClusters);

  const visibleClusters = surfaceSelection.visibleClusters
    .sort((left, right) => (right.signal_strength || 0) - (left.signal_strength || 0));
  const suppressedClusters = scoredClusters
    .filter(
      (cluster) =>
        !visibleClusters.some((visibleCluster) => visibleCluster.cluster_id === cluster.cluster_id)
    )
    .sort((left, right) => (right.signal_strength || 0) - (left.signal_strength || 0));

  const suppressionReasons = countBy(
    suppressedClusters.flatMap((cluster) => cluster.suppression_reasons || ["unspecified"])
  ).slice(0, 8);

  return {
    ok: true,
    window_hours: windowHours,
    window_start: windowStart,
    window_end: windowEnd,
    raw_item_count: rawItems.length,
    processed_cluster_count: scoredClusters.length,
    visible_tape_cluster_count: visibleClusters.length,
    visible_sample_state: surfaceSelection.visibleSampleState,
    surface_recovery_mode: surfaceSelection.surfaceRecoveryMode,
    provisional_visible_count: surfaceSelection.provisionalVisibleCount,
    suppressed_cluster_count: suppressedClusters.length,
    avg_source_count: Number(average(scoredClusters.map((cluster) => cluster.source_count)).toFixed(2)),
    avg_source_family_count: Number(average(scoredClusters.map((cluster) => cluster.source_family_count)).toFixed(2)),
    multi_family_cluster_count: scoredClusters.filter((cluster) => (cluster.source_family_count || 0) >= 2).length,
    single_family_visible_count: visibleClusters.filter((cluster) => (cluster.source_family_count || 0) === 1).length,
    translated_cluster_count: scoredClusters.filter((cluster) => cluster.contains_translated_item).length,
    top_suppression_reasons: suppressionReasons,
    sample_visible_clusters: visibleClusters.slice(0, 5).map(sampleCluster),
    sample_suppressed_clusters: suppressedClusters.slice(0, 5).map(sampleCluster),
    notes: [
      "raw_item_count is broad intake before normalization and clustering.",
      "visible_tape_cluster_count uses the same tape-eligibility logic as /api/dashboard.",
      surfaceSelection.surfaceRecoveryNote || "surface_recovery_mode reports whether provisional rows were reintroduced after full-authority collapse.",
      "top_suppression_reasons show why clusters were held out of the visible tape."
    ]
  };
}
