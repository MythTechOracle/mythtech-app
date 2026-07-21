import { loadRawItemsForWindow } from "../db/db.js";
import { formatSnapshotWindowLabel } from "./snapshotService.js";
import {
  normalizeRecallDomainScope,
  parseRecallWindowHours
} from "./basketRecallService.js";

const SUPPORTED_DOMAINS = ["signals", "uap"];

const INFRASTRUCTURE_WATCH_GROUPS = [
  {
    key: "power_grid",
    label: "Power / grid",
    patterns: [
      /\bblackout\b/u,
      /\belectricity\b/u,
      /\bgrid\b/u,
      /\bpower outage\b/u,
      /\bpower plant\b/u,
      /\bsubstation\b/u,
      /\btransmission\b/u,
      /\butility\b/u
    ]
  },
  {
    key: "transport",
    label: "Transport / logistics",
    patterns: [
      /\bairport\b/u,
      /\bport\b/u,
      /\brail\b/u,
      /\bshipping\b/u,
      /\bterminal\b/u,
      /\btransit\b/u
    ]
  },
  {
    key: "pipeline_energy",
    label: "Pipeline / energy",
    patterns: [
      /\bfuel supply\b/u,
      /\bgas terminal\b/u,
      /\bpipeline\b/u,
      /\brefinery\b/u
    ]
  },
  {
    key: "communications",
    label: "Communications",
    patterns: [
      /\bbroadband\b/u,
      /\bcommunications outage\b/u,
      /\binternet outage\b/u,
      /\bnetwork outage\b/u,
      /\btelecom\b/u
    ]
  },
  {
    key: "water_utility",
    label: "Water / utility",
    patterns: [
      /\bagua potable\b/u,
      /\bpotable water\b/u,
      /\bsewer\b/u,
      /\bservicio de agua\b/u,
      /\bwastewater\b/u,
      /\bwater service\b/u,
      /\bwater supply\b/u
    ]
  },
  {
    key: "service_disruption",
    label: "Service disruption",
    patterns: [
      /\bclosure\b/u,
      /\bdamage\b/u,
      /\bdisruption\b/u,
      /\boutage\b/u,
      /\bservice interruption\b/u,
      /\bsuspended\b/u
    ]
  }
];

function toIsoWindow(windowHours = 72) {
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

function compactText(row = {}) {
  return [
    row.title,
    row.summary,
    row.query_basket,
    row.category_hint,
    row.region,
    row.country
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
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

function rowTimestamp(row = {}) {
  return row.published_at || row.observed_at || null;
}

function compareRowsByTimeDesc(left, right) {
  return new Date(rowTimestamp(right) || 0) - new Date(rowTimestamp(left) || 0);
}

function matchInfrastructureSignals(row = {}) {
  const lowered = compactText(row);
  const matches = [];

  if (cleanKey(row.query_basket, "").toLowerCase() === "infrastructure") {
    matches.push({
      group: "basket_hint",
      label: "Infrastructure basket",
      term: "query_basket:infrastructure"
    });
  }

  if (cleanKey(row.category_hint, "").toLowerCase() === "infrastructure") {
    matches.push({
      group: "category_hint",
      label: "Infrastructure category hint",
      term: "category_hint:infrastructure"
    });
  }

  for (const group of INFRASTRUCTURE_WATCH_GROUPS) {
    for (const pattern of group.patterns) {
      if (pattern.test(lowered)) {
        matches.push({
          group: group.key,
          label: group.label,
          term: pattern.source.replaceAll("\\b", "")
        });
        break;
      }
    }
  }

  return matches;
}

function continuityStatus(row = {}, currentWindowStartMs = 0) {
  const timestamp = new Date(rowTimestamp(row) || "").getTime();
  if (Number.isFinite(timestamp) && timestamp >= currentWindowStartMs) {
    return "current_window_overlap";
  }
  return "continuity_backfill";
}

function compactCandidate(row, matches, currentWindowStartMs) {
  const status = continuityStatus(row, currentWindowStartMs);
  return {
    status,
    authority: "continuity_backfill_only",
    promotion_allowed: false,
    title: row.title || row.summary || "Untitled infrastructure intake item",
    domain: row.domain || "signals",
    source_name: row.source_name || null,
    source_type: row.source_type || null,
    query_basket: row.query_basket || null,
    category_hint: row.category_hint || null,
    published_at: row.published_at || null,
    observed_at: row.observed_at || null,
    region: row.region || null,
    country: row.country || null,
    url: row.url || null,
    match_groups: [...new Set(matches.map((match) => match.group))],
    match_terms: [...new Set(matches.map((match) => match.term))]
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

function summarizeBasket(basket, candidates = [], sampleLimit = 5) {
  const currentCount = candidates.filter((candidate) => candidate.status === "current_window_overlap").length;
  const backfillCount = candidates.filter((candidate) => candidate.status === "continuity_backfill").length;

  return {
    basket,
    candidate_count: candidates.length,
    current_window_overlap_count: currentCount,
    continuity_backfill_count: backfillCount,
    source_type_counts: summarizeCounts(candidates, (candidate) => candidate.source_type),
    category_hint_counts: summarizeCounts(candidates, (candidate) => candidate.category_hint),
    match_group_counts: summarizeCounts(
      candidates.flatMap((candidate) => candidate.match_groups.map((group) => ({ group }))),
      (row) => row.group
    ),
    sample_items: candidates.slice(0, sampleLimit)
  };
}

function summarizeDomain(domain, candidates = [], sampleLimit = 5) {
  const basketGroups = groupRows(candidates, (candidate) => candidate.query_basket || "unassigned");
  const baskets = [...basketGroups.entries()]
    .map(([basket, rows]) => summarizeBasket(basket, rows, sampleLimit))
    .sort((left, right) => right.candidate_count - left.candidate_count || left.basket.localeCompare(right.basket));

  return {
    domain,
    candidate_count: candidates.length,
    current_window_overlap_count: candidates.filter((candidate) => candidate.status === "current_window_overlap").length,
    continuity_backfill_count: candidates.filter((candidate) => candidate.status === "continuity_backfill").length,
    distinct_source_names: countDistinct(candidates, (candidate) => candidate.source_name),
    source_type_counts: summarizeCounts(candidates, (candidate) => candidate.source_type),
    category_hint_counts: summarizeCounts(candidates, (candidate) => candidate.category_hint),
    match_group_counts: summarizeCounts(
      candidates.flatMap((candidate) => candidate.match_groups.map((group) => ({ group }))),
      (row) => row.group
    ),
    baskets
  };
}

function backfillState(candidates = []) {
  const currentCount = candidates.filter((candidate) => candidate.status === "current_window_overlap").length;
  const backfillCount = candidates.filter((candidate) => candidate.status === "continuity_backfill").length;

  if (!candidates.length) {
    return "no_infrastructure_watch_signal";
  }
  if (backfillCount > 0 && currentCount > 0) {
    return "continuity_plus_current_overlap";
  }
  if (backfillCount > 0) {
    return "continuity_backfill_present";
  }
  return "current_window_only";
}

export function buildInfrastructureBackfillFromRows({
  rows = [],
  windowHours = 72,
  currentWindowHours = 6,
  windowStart,
  windowEnd,
  domainScope = "signals",
  sampleLimit = 5
} = {}) {
  const currentWindowStartMs = new Date(
    new Date(windowEnd || Date.now()).getTime() - currentWindowHours * 60 * 60 * 1000
  ).getTime();
  const candidates = rows
    .map((row) => ({ row, matches: matchInfrastructureSignals(row) }))
    .filter((entry) => entry.matches.length)
    .sort((left, right) => compareRowsByTimeDesc(left.row, right.row))
    .map((entry) => compactCandidate(entry.row, entry.matches, currentWindowStartMs));
  const domainGroups = groupRows(candidates, (candidate) => candidate.domain || "signals");
  const domains = [...domainGroups.entries()]
    .map(([domain, domainCandidates]) => summarizeDomain(domain, domainCandidates, sampleLimit))
    .sort((left, right) => right.candidate_count - left.candidate_count || left.domain.localeCompare(right.domain));
  const state = backfillState(candidates);

  return {
    ok: true,
    report: "infrastructure_watch_backfill",
    authority: "continuity_backfill_only",
    state,
    promotion_allowed: false,
    window_hours: windowHours,
    window: formatSnapshotWindowLabel(windowHours),
    current_window_hours: currentWindowHours,
    current_window: formatSnapshotWindowLabel(currentWindowHours),
    window_start: windowStart || null,
    window_end: windowEnd || null,
    domain_scope: domainScope,
    summary: {
      candidate_count: candidates.length,
      current_window_overlap_count: candidates.filter((candidate) => candidate.status === "current_window_overlap").length,
      continuity_backfill_count: candidates.filter((candidate) => candidate.status === "continuity_backfill").length,
      domain_count: domains.length,
      basket_count: countDistinct(candidates, (candidate) => candidate.query_basket || "unassigned"),
      distinct_source_names: countDistinct(candidates, (candidate) => candidate.source_name),
      source_type_counts: summarizeCounts(candidates, (candidate) => candidate.source_type),
      category_hint_counts: summarizeCounts(candidates, (candidate) => candidate.category_hint),
      match_group_counts: summarizeCounts(
        candidates.flatMap((candidate) => candidate.match_groups.map((group) => ({ group }))),
        (row) => row.group
      )
    },
    domains,
    notes: [
      "This lane preserves infrastructure continuity context only.",
      "It does not publish candidates into the visible tape, score them as live field authority, or count them as corroboration.",
      "Use it to explain recent power, grid, transport, utility, or communications items that may have fallen outside the current selected chamber."
    ]
  };
}

export async function buildInfrastructureBackfill({
  window: windowValue,
  hours,
  window_hours,
  current_window,
  current_window_hours,
  domain = "signals",
  sample_limit
} = {}) {
  const windowHours = parseRecallWindowHours(window_hours || hours || windowValue, 72);
  const currentWindowHours = parseRecallWindowHours(current_window_hours || current_window, 6);
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

  return buildInfrastructureBackfillFromRows({
    rows,
    windowHours,
    currentWindowHours,
    windowStart,
    windowEnd,
    domainScope,
    sampleLimit
  });
}
