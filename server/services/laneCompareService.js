import { loadRawItemsForWindow } from "../db/db.js";

function toIsoWindow(windowHours = 24) {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowHours * 60 * 60 * 1000);
  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString()
  };
}

function countDistinct(values = []) {
  return new Set(values.filter(Boolean)).size;
}

function missingText(value) {
  return value == null || String(value).trim() === "";
}

function missingNumber(value) {
  return value == null || value === "";
}

function normalizeSourceType(value) {
  return String(value || "").trim().toLowerCase();
}

function compareSourceTypes(rows = []) {
  const allowed = new Set(["gdelt", "acled"]);
  const seen = new Set(
    rows
      .map((row) => normalizeSourceType(row.source_type))
      .filter((value) => allowed.has(value))
  );

  return [...seen].sort();
}

function summarizeCounts(rows = [], keySelector) {
  const counts = {};
  for (const row of rows) {
    const key = keySelector(row) || "unassigned";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function summarizeLane(rows = []) {
  const externalIds = rows.map((row) => row.external_id).filter(Boolean);
  const published = rows.map((row) => row.published_at).filter(Boolean).sort();
  const observed = rows.map((row) => row.observed_at).filter(Boolean).sort();

  return {
    row_count: rows.length,
    distinct_external_ids: countDistinct(externalIds),
    duplicate_external_ids: rows.length - countDistinct(externalIds),
    missing_region: rows.filter((row) => missingText(row.region)).length,
    missing_country: rows.filter((row) => missingText(row.country)).length,
    missing_lat: rows.filter((row) => missingNumber(row.lat)).length,
    missing_lon: rows.filter((row) => missingNumber(row.lon)).length,
    missing_title: rows.filter((row) => missingText(row.title)).length,
    missing_summary: rows.filter((row) => missingText(row.summary)).length,
    recent_published_at_min: published[0] || null,
    recent_published_at_max: published[published.length - 1] || null,
    recent_observed_at_min: observed[0] || null,
    recent_observed_at_max: observed[observed.length - 1] || null,
    basket_counts: summarizeCounts(rows, (row) => row.query_basket),
    category_hint_counts: summarizeCounts(rows, (row) => row.category_hint),
    sample_rows: rows.slice(0, 5).map((row) => ({
      external_id: row.external_id,
      published_at: row.published_at,
      observed_at: row.observed_at,
      region: row.region,
      country: row.country,
      category_hint: row.category_hint,
      severity_hint: row.severity_hint,
      title: row.title
    }))
  };
}

export async function buildLaneCompare(windowHours = 24) {
  const { windowStart, windowEnd } = toIsoWindow(windowHours);
  const rawItems = loadRawItemsForWindow(windowStart, windowEnd);

  const relevantRows = rawItems.filter((row) => {
    const sourceType = normalizeSourceType(row.source_type);
    return sourceType === "gdelt" || sourceType === "acled";
  });

  const sources = {};
  for (const sourceType of compareSourceTypes(relevantRows)) {
    const laneRows = relevantRows.filter(
      (row) => normalizeSourceType(row.source_type) === sourceType
    );
    sources[sourceType] = summarizeLane(laneRows);
  }

  return {
    ok: true,
    window_hours: windowHours,
    window_start: windowStart,
    window_end: windowEnd,
    total_rows_in_window: relevantRows.length,
    source_types_present: compareSourceTypes(relevantRows),
    sources,
    notes: [
      "This route compares raw intake lanes only.",
      "It does not compare scores or dashboard semantics.",
      "published_at / observed_at ranges help verify the time seam.",
      "distinct_external_ids helps verify identity stability."
    ]
  };
}
