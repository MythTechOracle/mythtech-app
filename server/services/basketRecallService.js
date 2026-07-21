import { loadRawItemsForWindow } from "../db/db.js";
import {
  formatSnapshotWindowLabel,
  parseSnapshotWindowHours
} from "./snapshotService.js";

const SUPPORTED_DOMAINS = ["signals", "uap"];

function toIsoWindow(windowHours = 24) {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowHours * 60 * 60 * 1000);
  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString()
  };
}

function cleanKey(value, fallback = "unassigned") {
  const cleaned = String(value || "").trim();
  return cleaned || fallback;
}

function increment(counts, key) {
  const clean = cleanKey(key);
  counts[clean] = (counts[clean] || 0) + 1;
}

function summarizeCounts(rows = [], selector) {
  const counts = {};
  for (const row of rows) {
    increment(counts, selector(row));
  }
  return Object.fromEntries(
    Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
  );
}

function countDistinct(rows = [], selector) {
  return new Set(rows.map(selector).filter(Boolean).map((value) => String(value).trim()).filter(Boolean)).size;
}

function firstValue(values = []) {
  return values.length ? values[0] : null;
}

function lastValue(values = []) {
  return values.length ? values[values.length - 1] : null;
}

function summarizeTimeRange(rows = [], selector) {
  const values = rows.map(selector).filter(Boolean).sort();
  return {
    min: firstValue(values),
    max: lastValue(values)
  };
}

function compactSampleItem(row) {
  return {
    title: row.title || row.summary || "Untitled intake item",
    source_name: row.source_name || null,
    source_type: row.source_type || null,
    query_basket: row.query_basket || null,
    category_hint: row.category_hint || null,
    published_at: row.published_at || null,
    observed_at: row.observed_at || null,
    region: row.region || null,
    country: row.country || null,
    url: row.url || null
  };
}

function summarizeBasketRows(basket, rows = [], sampleLimit = 5) {
  const publishedRange = summarizeTimeRange(rows, (row) => row.published_at);
  const observedRange = summarizeTimeRange(rows, (row) => row.observed_at);

  return {
    basket,
    raw_item_count: rows.length,
    distinct_source_names: countDistinct(rows, (row) => row.source_name),
    distinct_external_ids: countDistinct(rows, (row) => row.external_id),
    source_type_counts: summarizeCounts(rows, (row) => row.source_type),
    category_hint_counts: summarizeCounts(rows, (row) => row.category_hint),
    recent_published_at_min: publishedRange.min,
    recent_published_at_max: publishedRange.max,
    recent_observed_at_min: observedRange.min,
    recent_observed_at_max: observedRange.max,
    sample_items: rows.slice(0, sampleLimit).map(compactSampleItem)
  };
}

function groupRows(rows = [], selector) {
  const groups = new Map();
  for (const row of rows) {
    const key = cleanKey(selector(row));
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(row);
  }
  return groups;
}

export function normalizeRecallDomainScope(value = "signals") {
  const clean = String(value || "signals").trim().toLowerCase();
  if (clean === "all" || clean === "*") {
    return "all";
  }
  return clean === "uap" ? "uap" : "signals";
}

export function parseRecallWindowHours(value, fallback = 24) {
  return parseSnapshotWindowHours(value, fallback);
}

export function buildBasketRecallFromRows({
  rows = [],
  windowHours = 24,
  windowStart,
  windowEnd,
  domainScope = "signals",
  sampleLimit = 5
} = {}) {
  const domainGroups = groupRows(rows, (row) => row.domain || "signals");
  const domains = [...domainGroups.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([domain, domainRows]) => {
      const basketGroups = groupRows(domainRows, (row) => row.query_basket || "unassigned");
      const baskets = [...basketGroups.entries()]
        .map(([basket, basketRows]) => summarizeBasketRows(basket, basketRows, sampleLimit))
        .sort((left, right) => right.raw_item_count - left.raw_item_count || left.basket.localeCompare(right.basket));

      return {
        domain,
        raw_item_count: domainRows.length,
        basket_count: baskets.length,
        distinct_source_names: countDistinct(domainRows, (row) => row.source_name),
        source_type_counts: summarizeCounts(domainRows, (row) => row.source_type),
        category_hint_counts: summarizeCounts(domainRows, (row) => row.category_hint),
        baskets
      };
    });

  return {
    ok: true,
    report: "basket_domain_recall",
    authority: "raw_intake_recall_only",
    window_hours: windowHours,
    window: formatSnapshotWindowLabel(windowHours),
    window_start: windowStart || null,
    window_end: windowEnd || null,
    domain_scope: domainScope,
    summary: {
      raw_item_count: rows.length,
      domain_count: domains.length,
      basket_count: countDistinct(rows, (row) => row.query_basket || "unassigned"),
      distinct_source_names: countDistinct(rows, (row) => row.source_name),
      source_type_counts: summarizeCounts(rows, (row) => row.source_type),
      category_hint_counts: summarizeCounts(rows, (row) => row.category_hint)
    },
    domains,
    notes: [
      "This report recalls raw intake by domain and basket.",
      "It does not assert dashboard visibility, event confirmation, scoring authority, or corroboration.",
      "Use it to answer what the system saw recently even when the current board no longer shows those items."
    ]
  };
}

export async function buildBasketRecall({
  window: windowValue,
  hours,
  window_hours,
  domain = "signals",
  sample_limit
} = {}) {
  const windowHours = parseRecallWindowHours(window_hours || hours || windowValue, 24);
  const domainScope = normalizeRecallDomainScope(domain);
  const requestedSampleLimit = sample_limit === undefined || sample_limit === null || sample_limit === ""
    ? 5
    : Number(sample_limit);
  const sampleLimit = Number.isFinite(requestedSampleLimit)
    ? Math.max(0, Math.min(10, requestedSampleLimit))
    : 5;
  const { windowStart, windowEnd } = toIsoWindow(windowHours);
  const domainsToLoad = domainScope === "all" ? SUPPORTED_DOMAINS : [domainScope];
  const rows = domainsToLoad.flatMap((scopedDomain) =>
    loadRawItemsForWindow(windowStart, windowEnd, scopedDomain)
  );

  return buildBasketRecallFromRows({
    rows,
    windowHours,
    windowStart,
    windowEnd,
    domainScope,
    sampleLimit
  });
}
