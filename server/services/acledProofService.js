import { loadRawItemsForWindow } from "../db/db.js";
import { normalizeRawItems } from "./normalizationService.js";
import { buildClusters } from "./clusteringService.js";
import { scoreClustersForTape } from "./scoringService.js";

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into",
  "is", "it", "its", "of", "on", "or", "over", "that", "the", "their", "this",
  "to", "under", "was", "were", "with", "while"
]);

function toIsoWindow(windowHours = 24) {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowHours * 60 * 60 * 1000);
  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString()
  };
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function average(values = []) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values = [], p = 0.5) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[index];
}

function normalizeValue(value = "") {
  return String(value || "").trim().toLowerCase();
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function tokenizeText(value = "") {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !STOPWORDS.has(token));
}

function setSimilarity(leftValues = [], rightValues = []) {
  const left = new Set(leftValues || []);
  const right = new Set(rightValues || []);
  if (!left.size || !right.size) {
    return 0;
  }

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function unionTokens(...groups) {
  const merged = new Set();
  for (const group of groups) {
    for (const token of group || []) {
      if (token) {
        merged.add(token);
      }
    }
  }
  return [...merged];
}

function sourceTypeIsAcled(row) {
  return normalizeValue(row?.source_type) === "acled";
}

function hasKnownValue(value) {
  const normalized = normalizeValue(value);
  return Boolean(normalized && normalized !== "unknown" && normalized !== "none");
}

function locationDepth(type = "unknown", label = "", country = "") {
  if (hasKnownValue(label) && ["site", "airport", "port"].includes(normalizeValue(type))) return 1;
  if (hasKnownValue(label) && normalizeValue(type) === "region") return 0.8;
  if (hasKnownValue(country)) return 0.55;
  return 0;
}

function locationQuality({ eventLocationConfidence, eventLocationType, eventLocation, eventCountry }) {
  const confidence = clamp(Number(eventLocationConfidence || 0), 0, 1);
  return Number((confidence * 0.7 + locationDepth(eventLocationType, eventLocation, eventCountry) * 0.3).toFixed(2));
}

function minutesBetween(left, right) {
  return Math.abs(new Date(left).getTime() - new Date(right).getTime()) / 60000;
}

function timeScore(deltaMinutes) {
  if (!Number.isFinite(deltaMinutes)) return 0;
  if (deltaMinutes <= 120) return 1;
  if (deltaMinutes <= 360) return 0.88;
  if (deltaMinutes <= 720) return 0.74;
  if (deltaMinutes <= 1440) return 0.52;
  return 0;
}

function categoryCompatibility(left, right) {
  const a = normalizeValue(left);
  const b = normalizeValue(right);
  if (!a || !b) {
    return { score: 0.35, alignment: "unknown" };
  }
  if (a === b) {
    return { score: 1, alignment: "same_category" };
  }

  const pair = new Set([a, b]);
  if (pair.has("security") && pair.has("infrastructure")) {
    return { score: 0.86, alignment: "same_incident_cross_facet" };
  }
  if (pair.has("security") && pair.has("diplomacy")) {
    return { score: 0.7, alignment: "same_incident_cross_facet" };
  }

  return { score: 0.25, alignment: "category_conflict" };
}

function inferActorGain(acledProfile, mediaProfile) {
  const acledCount = acledProfile.entityTokens.length;
  const mediaCount = mediaProfile.entityTokens.length;
  if (acledCount > mediaCount && acledCount > 0) return "acled";
  if (mediaCount > acledCount && mediaCount > 0) return "media";
  return "same";
}

function inferLocationGain(acledProfile, mediaProfile) {
  const acledQuality = locationQuality(acledProfile);
  const mediaQuality = locationQuality(mediaProfile);
  if (acledQuality >= mediaQuality + 0.12) return "acled";
  if (mediaQuality >= acledQuality + 0.12) return "media";
  return "same";
}

function structuredCorroborationForMatch(match) {
  const strong = match.match_score >= 0.8;
  const locationGain = match.location_gain === "acled";
  const actorGain = match.actor_gain === "acled";
  const confidenceLift = strong && (locationGain || actorGain) ? 0.08 : 0.04;

  return {
    acled_matched: true,
    acled_match_score: match.match_score,
    acled_time_delta_minutes: match.time_delta_minutes,
    acled_location_gain: locationGain,
    acled_actor_gain: actorGain,
    acled_category_alignment: match.category_alignment,
    structured_corroboration_class: "acled",
    structured_match_strength: strong ? "strong" : "plausible",
    structured_corroboration_note: strong
      ? "Structured corroboration present from ACLED shadow lane."
      : "Plausible structured corroboration present from ACLED shadow lane.",
    suggested_confidence_lift: confidenceLift
  };
}

function isPromotionReady(match) {
  return (
    match.match_score >= 0.8 &&
    match.time_delta_minutes <= 360 &&
    ["security", "infrastructure"].includes(normalizeValue(match.media.category)) &&
    match.category_alignment !== "category_conflict" &&
    (
      match.location_gain === "acled" ||
      match.actor_gain === "acled" ||
      (match.media.source_family_count || 0) >= 2
    )
  );
}

function summarizeUnmatchedReason(bestCandidate) {
  if (!bestCandidate) {
    return "no_plausible_media_cluster";
  }
  if (bestCandidate.category_alignment === "category_conflict") {
    return "category_conflict";
  }
  if (bestCandidate.time_delta_minutes > 1440) {
    return "outside_reasonable_time_lag";
  }
  if (bestCandidate.geography_score < 0.45) {
    return "insufficient_geography_alignment";
  }
  return "best_candidate_below_threshold";
}

function makeExample(acledProfile, match) {
  return {
    acled_event_id: acledProfile.acled_event_id,
    acled_event_time: acledProfile.event_time,
    acled_category: acledProfile.category,
    acled_event_type: acledProfile.event_type,
    acled_sub_event_type: acledProfile.sub_event_type,
    acled_country: acledProfile.eventCountry || acledProfile.country || null,
    acled_location: acledProfile.eventLocation || null,
    media_cluster_id: match.media.cluster_id,
    media_event_time: match.media.event_time,
    media_category: match.media.category,
    media_region: match.media.region,
    media_observed_update: match.media.observed_update,
    match_score: match.match_score,
    match_band: match.match_band,
    time_delta_minutes: match.time_delta_minutes,
    location_gain: match.location_gain,
    actor_gain: match.actor_gain,
    category_alignment: match.category_alignment,
    visible_on_tape: Boolean(match.media.visible_in_tape),
    structured_corroboration: structuredCorroborationForMatch(match)
  };
}

function buildAcledProfile(rawRow, normalizedItem) {
  const payload = safeJsonParse(rawRow?.raw_payload);
  const actor1Tokens = tokenizeText(payload.actor1 || "");
  const actor2Tokens = tokenizeText(payload.actor2 || "");
  const payloadLocationTokens = unionTokens(
    tokenizeText(payload.location || ""),
    tokenizeText(payload.admin1 || ""),
    tokenizeText(payload.country || "")
  );
  const payloadActionTokens = unionTokens(
    tokenizeText(payload.event_type || ""),
    tokenizeText(payload.sub_event_type || "")
  );

  return {
    raw_id: rawRow.id,
    acled_event_id: rawRow.external_id || `acled-${rawRow.id}`,
    event_time: normalizedItem.eventTime,
    category: normalizedItem.category,
    region: normalizedItem.region,
    country: normalizedItem.country || rawRow.country || null,
    eventCountry: normalizedItem.eventCountry || normalizedItem.country || rawRow.country || null,
    eventLocation: normalizedItem.eventLocation || payload.location || null,
    eventLocationType: normalizedItem.eventLocationType || "unknown",
    eventLocationConfidence: Number(normalizedItem.eventLocationConfidence || 0),
    eventLocationSource: normalizedItem.eventLocationSource || "unknown",
    actor1: payload.actor1 || null,
    actor2: payload.actor2 || null,
    fatalities: Number(payload.fatalities || 0),
    event_type: payload.event_type || null,
    sub_event_type: payload.sub_event_type || null,
    notes: payload.notes || rawRow.summary || null,
    actorTokens: unionTokens(normalizedItem.incidentActorTokens, actor1Tokens),
    targetTokens: unionTokens(normalizedItem.incidentTargetTokens, actor2Tokens),
    entityTokens: unionTokens(
      normalizedItem.incidentActorTokens,
      normalizedItem.incidentTargetTokens,
      actor1Tokens,
      actor2Tokens
    ),
    actionTokens: unionTokens(normalizedItem.incidentActionTokens, payloadActionTokens),
    locationTokens: unionTokens(normalizedItem.incidentLocationTokens, payloadLocationTokens)
  };
}

function buildMediaClusterProfile(cluster, members = []) {
  const actorTokens = unionTokens(...members.map((member) => member.incidentActorTokens || []));
  const targetTokens = unionTokens(...members.map((member) => member.incidentTargetTokens || []));
  const entityTokens = unionTokens(actorTokens, targetTokens);
  const actionTokens = unionTokens(...members.map((member) => member.incidentActionTokens || []));
  const locationTokens = unionTokens(...members.map((member) => member.incidentLocationTokens || []));
  const eventLocationConfidence = Math.max(...members.map((member) => Number(member.eventLocationConfidence || 0)), 0);
  const primaryLocatedMember =
    [...members].sort((left, right) => Number(right.eventLocationConfidence || 0) - Number(left.eventLocationConfidence || 0))[0] || null;

  return {
    cluster_id: cluster.cluster_id,
    event_time: cluster.event_time,
    category: cluster.category,
    region: cluster.region,
    country: cluster.country || null,
    eventCountry: cluster.event_country || cluster.country || null,
    eventLocation: primaryLocatedMember?.eventLocation || cluster.event_location || null,
    eventLocationType: primaryLocatedMember?.eventLocationType || "unknown",
    eventLocationConfidence,
    eventLocationSource: primaryLocatedMember?.eventLocationSource || "unknown",
    source_family_count: cluster.source_family_count || 0,
    source_count: cluster.source_count || 0,
    confidence: cluster.confidence || 0,
    visible_in_tape: Boolean(cluster.visible_in_tape),
    observed_update: cluster.observed_update,
    actorTokens,
    targetTokens,
    entityTokens,
    actionTokens,
    locationTokens
  };
}

function evaluateIncidentAffinity(acledProfile, mediaProfile) {
  const deltaMinutes = minutesBetween(acledProfile.event_time, mediaProfile.event_time);
  const timing = timeScore(deltaMinutes);
  const sameLocation = hasKnownValue(acledProfile.eventLocation) &&
    hasKnownValue(mediaProfile.eventLocation) &&
    normalizeValue(acledProfile.eventLocation) === normalizeValue(mediaProfile.eventLocation);
  const sameCountry = hasKnownValue(acledProfile.eventCountry) &&
    hasKnownValue(mediaProfile.eventCountry) &&
    normalizeValue(acledProfile.eventCountry) === normalizeValue(mediaProfile.eventCountry);
  const sameRegion = hasKnownValue(acledProfile.region) &&
    hasKnownValue(mediaProfile.region) &&
    normalizeValue(acledProfile.region) === normalizeValue(mediaProfile.region);
  const locationTokenSimilarity = setSimilarity(acledProfile.locationTokens, mediaProfile.locationTokens);
  const actorSimilarity = setSimilarity(acledProfile.actorTokens, mediaProfile.actorTokens);
  const targetSimilarity = setSimilarity(acledProfile.targetTokens, mediaProfile.targetTokens);
  const entitySimilarity = setSimilarity(acledProfile.entityTokens, mediaProfile.entityTokens);
  const actionSimilarity = setSimilarity(acledProfile.actionTokens, mediaProfile.actionTokens);
  const category = categoryCompatibility(acledProfile.category, mediaProfile.category);

  const geographyScore = sameLocation
    ? 1
    : sameCountry
      ? Math.max(0.8, locationTokenSimilarity)
      : sameRegion
        ? Math.max(0.65, locationTokenSimilarity)
        : locationTokenSimilarity >= 0.45
          ? locationTokenSimilarity
          : 0;

  const hardMatch =
    timing > 0 &&
    (
      geographyScore >= 0.5 ||
      (
        deltaMinutes <= 360 &&
        entitySimilarity >= 0.45 &&
        actionSimilarity >= 0.3
      )
    );

  const score = Number(
    clamp(
      timing * 0.22 +
        geographyScore * 0.26 +
        entitySimilarity * 0.18 +
        actorSimilarity * 0.08 +
        targetSimilarity * 0.06 +
        actionSimilarity * 0.12 +
        category.score * 0.08,
      0,
      1
    ).toFixed(2)
  );

  const matchBand =
    !hardMatch || score < 0.65 ? "none" :
    score >= 0.8 ? "strong" :
    "plausible";

  return {
    media: mediaProfile,
    time_delta_minutes: Math.round(deltaMinutes),
    timing_score: Number(timing.toFixed(2)),
    geography_score: Number(geographyScore.toFixed(2)),
    entity_score: Number(entitySimilarity.toFixed(2)),
    actor_score: Number(actorSimilarity.toFixed(2)),
    target_score: Number(targetSimilarity.toFixed(2)),
    action_score: Number(actionSimilarity.toFixed(2)),
    category_score: Number(category.score.toFixed(2)),
    category_alignment: category.alignment,
    location_gain: inferLocationGain(acledProfile, mediaProfile),
    actor_gain: inferActorGain(acledProfile, mediaProfile),
    same_location: sameLocation,
    same_country: sameCountry,
    same_region: sameRegion,
    match_score: score,
    match_band: matchBand
  };
}

function pickBestCandidate(acledProfile, mediaProfiles) {
  let best = null;

  for (const mediaProfile of mediaProfiles) {
    const candidate = evaluateIncidentAffinity(acledProfile, mediaProfile);
    if (!best || candidate.match_score > best.match_score) {
      best = candidate;
    }
  }

  return best;
}

function roundMetric(value) {
  return Number(value.toFixed(2));
}

export async function buildAcledProof(windowHours = 24) {
  const { windowStart, windowEnd } = toIsoWindow(windowHours);
  const rawItems = loadRawItemsForWindow(windowStart, windowEnd);
  const acledShadowMode = String(process.env.ACLED_SHADOW_MODE || "true").toLowerCase() !== "false";
  const acledEnabled = String(process.env.ACLED_ENABLED || "false").toLowerCase() === "true";

  const acledRows = rawItems.filter(sourceTypeIsAcled);
  const mediaRows = rawItems.filter((row) => !sourceTypeIsAcled(row));

  const [acledNormalized, mediaNormalized] = await Promise.all([
    normalizeRawItems(acledRows),
    normalizeRawItems(mediaRows)
  ]);

  const mediaClusters = scoreClustersForTape(buildClusters(mediaNormalized));
  const mediaMemberById = new Map(mediaNormalized.map((item) => [item.rawId, item]));
  const mediaProfiles = mediaClusters.map((cluster) => {
    const memberIds = JSON.parse(cluster.raw_item_ids || "[]");
    const members = memberIds
      .map((id) => mediaMemberById.get(id))
      .filter(Boolean);
    return buildMediaClusterProfile(cluster, members);
  });

  const acledRawById = new Map(acledRows.map((row) => [row.id, row]));
  const evaluated = acledNormalized.map((normalizedItem) => {
    const rawRow = acledRawById.get(normalizedItem.rawId);
    const acledProfile = buildAcledProfile(rawRow, normalizedItem);
    const bestCandidate = pickBestCandidate(acledProfile, mediaProfiles);
    const matched = bestCandidate && bestCandidate.match_band !== "none";

    return {
      acled: acledProfile,
      bestCandidate,
      matched,
      unmatched_reason: matched ? null : summarizeUnmatchedReason(bestCandidate)
    };
  });

  const matched = evaluated.filter((entry) => entry.matched);
  const strongMatches = matched.filter((entry) => entry.bestCandidate.match_band === "strong");
  const plausibleMatches = matched.filter((entry) => entry.bestCandidate.match_band === "plausible");
  const unmatched = evaluated.filter((entry) => !entry.matched);
  const matchedMediaIds = new Set(matched.map((entry) => entry.bestCandidate.media.cluster_id));
  const timeDeltas = matched.map((entry) => entry.bestCandidate.time_delta_minutes);
  const promotionReady = matched
    .filter((entry) => isPromotionReady({
      ...entry.bestCandidate,
      media: entry.bestCandidate.media
    }))
    .map((entry) => makeExample(entry.acled, entry.bestCandidate));

  const matchedExamples = matched
    .sort((left, right) => right.bestCandidate.match_score - left.bestCandidate.match_score)
    .slice(0, 5)
    .map((entry) => makeExample(entry.acled, entry.bestCandidate));

  const unmatchedAcledExamples = unmatched
    .sort((left, right) => new Date(right.acled.event_time) - new Date(left.acled.event_time))
    .slice(0, 5)
    .map((entry) => ({
      acled_event_id: entry.acled.acled_event_id,
      acled_event_time: entry.acled.event_time,
      acled_category: entry.acled.category,
      acled_event_type: entry.acled.event_type,
      acled_sub_event_type: entry.acled.sub_event_type,
      acled_country: entry.acled.eventCountry || entry.acled.country || null,
      acled_location: entry.acled.eventLocation || null,
      best_candidate_cluster_id: entry.bestCandidate?.media?.cluster_id || null,
      best_candidate_score: entry.bestCandidate?.match_score ?? null,
      unmatched_reason: entry.unmatched_reason
    }));

  const unmatchedMediaExamples = mediaProfiles
    .filter((profile) => !matchedMediaIds.has(profile.cluster_id))
    .sort((left, right) => new Date(right.event_time) - new Date(left.event_time))
    .slice(0, 5)
    .map((profile) => ({
      cluster_id: profile.cluster_id,
      event_time: profile.event_time,
      region: profile.region,
      category: profile.category,
      observed_update: profile.observed_update,
      source_family_count: profile.source_family_count,
      visible_on_tape: profile.visible_in_tape
    }));

  const locationGainCounts = {
    acled: matched.filter((entry) => entry.bestCandidate.location_gain === "acled").length,
    same: matched.filter((entry) => entry.bestCandidate.location_gain === "same").length,
    media: matched.filter((entry) => entry.bestCandidate.location_gain === "media").length
  };

  const actorGainCounts = {
    acled: matched.filter((entry) => entry.bestCandidate.actor_gain === "acled").length,
    same: matched.filter((entry) => entry.bestCandidate.actor_gain === "same").length,
    media: matched.filter((entry) => entry.bestCandidate.actor_gain === "media").length
  };

  const notes = [
    "This route is proof-only and does not promote ACLED into the visible board by itself.",
    "ACLED remains structured corroboration here; it does not increment media source breadth.",
    "Match scores are incident-affinity comparisons across time, geography, actors, actions, and category compatibility."
  ];

  if (!acledEnabled) {
    notes.unshift("ACLED ingest is disabled in the current environment, so this proof read is structural only until ACLED rows are present.");
  } else if (acledRows.length === 0) {
    notes.unshift("ACLED shadow mode is enabled, but no ACLED rows were present in the selected window.");
  }

  return {
    ok: true,
    window_hours: windowHours,
    window_start: windowStart,
    window_end: windowEnd,
    acled_shadow_mode: acledShadowMode,
    acled_enabled: acledEnabled,
    acled_event_count: acledRows.length,
    media_cluster_count: mediaProfiles.length,
    visible_media_cluster_count: mediaProfiles.filter((profile) => profile.visible_in_tape).length,
    matched_acled_event_count: matched.length,
    unmatched_acled_event_count: unmatched.length,
    match_rate: acledRows.length ? roundMetric(matched.length / acledRows.length) : 0,
    matched_media_cluster_count: matchedMediaIds.size,
    unmatched_media_cluster_count: Math.max(0, mediaProfiles.length - matchedMediaIds.size),
    media_match_rate: mediaProfiles.length ? roundMetric(matchedMediaIds.size / mediaProfiles.length) : 0,
    strong_match_count: strongMatches.length,
    plausible_match_count: plausibleMatches.length,
    avg_time_delta_minutes: timeDeltas.length ? Math.round(average(timeDeltas)) : null,
    median_time_delta_minutes: timeDeltas.length ? Math.round(percentile(timeDeltas, 0.5)) : null,
    p90_time_delta_minutes: timeDeltas.length ? Math.round(percentile(timeDeltas, 0.9)) : null,
    matched_pairs_with_better_acled_location: locationGainCounts.acled,
    matched_pairs_with_same_location: locationGainCounts.same,
    matched_pairs_with_better_media_location: locationGainCounts.media,
    unknown_media_location_vs_acled_known_count: matched.filter((entry) => {
      const media = entry.bestCandidate.media;
      return !hasKnownValue(media.eventLocation) && !hasKnownValue(media.eventCountry) &&
        (hasKnownValue(entry.acled.eventLocation) || hasKnownValue(entry.acled.eventCountry));
    }).length,
    matched_pairs_with_acled_actor_gain: actorGainCounts.acled,
    matched_pairs_with_same_actor_clarity: actorGainCounts.same,
    matched_pairs_with_media_only_actor_signal: actorGainCounts.media,
    same_category_match_count: matched.filter((entry) => entry.bestCandidate.category_alignment === "same_category").length,
    cross_category_but_same_incident_count: matched.filter((entry) => entry.bestCandidate.category_alignment === "same_incident_cross_facet").length,
    category_conflict_count: evaluated.filter((entry) => entry.bestCandidate?.category_alignment === "category_conflict").length,
    matched_examples: matchedExamples,
    unmatched_acled_examples: unmatchedAcledExamples,
    unmatched_media_examples: unmatchedMediaExamples,
    promotion_ready_examples: promotionReady.slice(0, 5),
    promotion_ready_count: promotionReady.length,
    notes
  };
}
