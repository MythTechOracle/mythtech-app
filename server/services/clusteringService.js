import crypto from "node:crypto";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "for",
  "with", "after", "before", "from", "by", "at", "is", "are", "was", "were",
  "that", "this", "it", "its", "as", "into", "while", "over", "under"
]);

const ACTION_TERMS = new Set([
  "advisory",
  "agreement",
  "attack",
  "breach",
  "ceasefire",
  "closure",
  "collapse",
  "delay",
  "denies",
  "disruption",
  "guidance",
  "launch",
  "meeting",
  "missile",
  "negotiation",
  "outage",
  "pause",
  "postpones",
  "restriction",
  "restore",
  "strike",
  "talks",
  "threatens",
  "warning"
]);

const RELEVANCE_FLAG_KEYS = [
  "localIncidentLike",
  "municipalUtilityLike",
  "routineTrafficCollisionLike",
  "localCrimeWithoutBroaderContext",
  "lowFieldAuthority",
  "strategicInfrastructureLike",
  "stateActorLike",
  "crossBorderLike",
  "nationalImpactLike"
];

const ESCALATION_FLAG_KEYS = [
  "stateActorLike",
  "militaryActorLike",
  "defenseSecurityInstitutionLike",
  "crossBorderLike",
  "retaliationLanguageLike",
  "ceasefireBreakdownLike",
  "sanctionPolicyPressureLike",
  "mobilizationLike",
  "strategicInfrastructureTargetLike",
  "diplomaticCrisisLike"
];

const CATEGORY_PRIORITY = {
  security: 5,
  infrastructure: 4,
  cyber: 3,
  diplomacy: 2,
  policy: 1,
  information: 0
};

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(text = "") {
  return String(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !STOPWORDS.has(word));
}

function jaccardSimilarity(aTokens, bTokens) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function hoursBetween(a, b) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 36e5;
}

function normalizedValue(value = "") {
  return String(value || "").trim().toLowerCase();
}

function sameRegion(a, b) {
  return Boolean(
    a?.region &&
    b?.region &&
    normalizedValue(a.region) !== "unknown" &&
    normalizedValue(b.region) !== "unknown" &&
    normalizedValue(a.region) === normalizedValue(b.region)
  );
}

function sameCountry(a, b) {
  return Boolean(
    a?.country &&
    b?.country &&
    normalizedValue(a.country) !== "unknown" &&
    normalizedValue(b.country) !== "unknown" &&
    normalizedValue(a.country) === normalizedValue(b.country)
  );
}

function sameEventLocation(a, b) {
  return Boolean(
    a?.eventLocation &&
    b?.eventLocation &&
    normalizedValue(a.eventLocation) === normalizedValue(b.eventLocation)
  );
}

function hasUsableLocation(item) {
  return Boolean(
    (item?.eventLocation && normalizedValue(item.eventLocation) !== "unknown") ||
    (item?.region && normalizedValue(item.region) !== "unknown") ||
    item?.country
  );
}

function sourceFamilyFor(item) {
  return item.sourceFamily || item.source_family || item.sourceType || item.source_type || item.sourceName || item.source_name || "unknown";
}

function sourceNameFor(item) {
  return item.sourceName || item.source_name || item.connectorName || "unknown";
}

function severityRank(value = "LOW") {
  const key = String(value).toLowerCase();
  if (key === "high") return 3;
  if (key === "medium") return 2;
  return 1;
}

function confirmationLabel(sourceFamilyCount, sourceCount) {
  if (sourceFamilyCount >= 3) return "Confirmed Multi Source";
  if (sourceFamilyCount >= 2) return "Emerging Multi Source";
  if (sourceCount >= 2) return "Single Family Pickup";
  return "Single Source";
}

function clusterConfidence(baseConfidence, cluster) {
  const familyBoost = Math.max(0, cluster.sourceFamilies.size - 1) * 0.06;
  const extraSourceBoost = Math.max(0, cluster.sourceNames.size - cluster.sourceFamilies.size) * 0.01;
  const supportBoost = Math.min(0.18, familyBoost + extraSourceBoost);
  const qualityBoost = Math.min(0.08, Math.max(0, cluster.maxEventLikeness - 0.55) * 0.25);
  const noisePenalty = Math.min(0.08, cluster.averageNoiseScore * 0.18);
  return clamp(Number(baseConfidence || 0.55) + supportBoost + qualityBoost - noisePenalty, 0.35, 0.95);
}

function makeClusterId(cluster) {
  const base = [
    cluster.region || cluster.anchor.region || "unknown",
    cluster.category || "information",
    cluster.representativeTitle || "untitled",
    cluster.firstSeen || "na"
  ].join("::");

  return `cl_${crypto.createHash("sha1").update(base).digest("hex").slice(0, 12)}`;
}

function average(values = []) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function actionTokens(tokens = []) {
  return tokens.filter((token) => ACTION_TERMS.has(token));
}

function locationSimilarityScore(eventLocationMatch, regionMatch, countryMatch) {
  if (eventLocationMatch) return 1;
  if (regionMatch) return 1;
  if (countryMatch) return 0.7;
  return 0;
}

function setSimilarity(leftTokens = [], rightTokens = []) {
  const left = Array.isArray(leftTokens) ? leftTokens : [...(leftTokens || [])];
  const right = Array.isArray(rightTokens) ? rightTokens : [...(rightTokens || [])];
  if (!left.length || !right.length) {
    return 0;
  }

  return jaccardSimilarity(left, right);
}

function categoryCompatibility(clusterCategory, itemCategory) {
  if (clusterCategory === itemCategory) {
    return {
      compatible: true,
      crossCategory: false
    };
  }

  const pair = new Set([clusterCategory, itemCategory]);
  if (pair.has("security") && pair.has("infrastructure")) {
    return {
      compatible: true,
      crossCategory: true
    };
  }

  return {
    compatible: false,
    crossCategory: false
  };
}

function updateIncidentIdentity(cluster, item) {
  for (const token of item.incidentActorTokens || []) {
    cluster.incidentActorTokens.add(token);
  }

  for (const token of item.incidentTargetTokens || []) {
    cluster.incidentTargetTokens.add(token);
  }

  for (const token of item.incidentLocationTokens || []) {
    cluster.incidentLocationTokens.add(token);
  }

  for (const token of item.incidentActionTokens || []) {
    cluster.incidentActionTokens.add(token);
  }

  for (const token of item.incidentKeyTokens || []) {
    cluster.incidentKeyTokens.add(token);
  }
}

function chooseClusterCategory(cluster) {
  const entries = Object.entries(cluster.categoryCounts || {});
  if (!entries.length) {
    return cluster.category || "information";
  }

  const hasSecurity = Boolean(cluster.categoryCounts?.security);
  const hasInfrastructure = Boolean(cluster.categoryCounts?.infrastructure);
  if (hasSecurity && hasInfrastructure) {
    return "security";
  }

  entries.sort((left, right) => {
    const countDiff = right[1] - left[1];
    if (countDiff !== 0) {
      return countDiff;
    }

    return (CATEGORY_PRIORITY[right[0]] || 0) - (CATEGORY_PRIORITY[left[0]] || 0);
  });

  return entries[0][0];
}

function representativeScore(item) {
  const titleRichness = clamp((item.titleTokens?.length || 0) / 10, 0, 1);
  const locationScore = hasUsableLocation(item) ? 1 : 0;
  const lowNoiseScore = 1 - clamp(item.noiseScore || 0, 0, 1);
  const fieldRelevance = clamp(item.fieldRelevance || 0.5, 0, 1);

  return Number((
    (item.eventLikeness || 0) * 0.48 +
    fieldRelevance * 0.16 +
    locationScore * 0.18 +
    lowNoiseScore * 0.12 +
    titleRichness * 0.06
  ).toFixed(3));
}

function isWeakItem(item) {
  let signals = 0;
  if (item.noiseFlags?.genericRoundup) signals += 1;
  if (item.noiseFlags?.lowInformationTitle) signals += 1;
  if (item.noiseFlags?.celebrityCollision) signals += 1;
  if (!hasUsableLocation(item)) signals += 1;
  if ((item.eventLikeness || 0) < 0.38) signals += 1;
  if ((item.noiseScore || 0) >= 0.45) signals += 1;
  return signals >= 2;
}

function promoteRepresentative(cluster, item, itemTokens, itemActionTokens) {
  cluster.representativeTitle = item.observedUpdate || item.title || "Untitled update";
  cluster.representativeSummary = item.summary || "";
  cluster.representativeComparisonText = item.comparisonText || "";
  cluster.representativeTitleTokens = item.titleTokens?.length ? [...item.titleTokens] : [...itemTokens];
  cluster.representativeSummaryTokens = normalizeText(item.summary || item.normalizedSummary || "");
  cluster.representativeComparisonTokens = normalizeText(item.comparisonText || "");
  cluster.representativeActionTokens = itemActionTokens.length ? [...itemActionTokens] : actionTokens(itemTokens);
  cluster.representativeNoiseFlags = item.noiseFlags || {};
  cluster.representativeNoiseScore = Number(item.noiseScore || 0);
  cluster.representativeEventLikeness = Number(item.eventLikeness || 0);
  cluster.representativeRelevanceFlags = item.relevanceFlags || {};
  cluster.representativeFieldRelevance = Number(item.fieldRelevance || 0.5);
  cluster.representativeEscalationFlags = item.escalationFlags || {};
  cluster.representativeEscalationSignal = Number(item.escalationSignal || 0);
  cluster.representativeIncidentLocationTokens = [...(item.incidentLocationTokens || [])];
  cluster.representativeQuality = representativeScore(item);
  cluster.anchor = {
    eventLocation: item.eventLocation || cluster.anchor.eventLocation || null,
    region: item.region || cluster.anchor.region || "Unknown",
    country: item.country || cluster.anchor.country || null
  };
  cluster.eventLocation = item.eventLocation || cluster.eventLocation || null;
  cluster.region = item.region || cluster.region || "Unknown";
  cluster.country = item.country || cluster.country || null;
}

function updateRelevanceCounts(cluster, item) {
  for (const key of RELEVANCE_FLAG_KEYS) {
    if (item.relevanceFlags?.[key]) {
      cluster.relevanceCounts[key] = (cluster.relevanceCounts[key] || 0) + 1;
    }
  }
}

function updateEscalationCounts(cluster, item) {
  for (const key of ESCALATION_FLAG_KEYS) {
    if (item.escalationFlags?.[key]) {
      cluster.escalationCounts[key] = (cluster.escalationCounts[key] || 0) + 1;
    }
  }
}

function shouldPromoteRepresentative(cluster, item) {
  const nextScore = representativeScore(item);
  if (!cluster.representativeTitle) {
    return true;
  }

  const currentFlags = cluster.representativeNoiseFlags || {};
  const nextFlags = item.noiseFlags || {};

  if (currentFlags.genericRoundup && !nextFlags.genericRoundup) {
    return true;
  }

  if (cluster.region === "Unknown" && item.region && item.region !== "Unknown") {
    return true;
  }

  const currentLocationDepth = cluster.representativeIncidentLocationTokens?.length || 0;
  const nextLocationDepth = item.incidentLocationTokens?.length || 0;
  if (nextLocationDepth > currentLocationDepth && item.region && item.region !== cluster.region) {
    return true;
  }

  if (nextScore > (cluster.representativeQuality || 0) + 0.03) {
    return true;
  }

  if (nextScore >= (cluster.representativeQuality || 0) && (item.noiseScore || 0) < (cluster.representativeNoiseScore || 0)) {
    return true;
  }

  return false;
}

function mergeScore(cluster, item, itemTokens, publishedAt, options) {
  const categoryMatch = categoryCompatibility(cluster.category, item.category);
  if (!categoryMatch.compatible) {
    return null;
  }

  const eventLocationMatch = sameEventLocation(cluster.anchor, item);
  const regionMatch = sameRegion(cluster.anchor, item);
  const countryMatch = sameCountry(cluster.anchor, item);
  const ageHours = hoursBetween(cluster.lastSeen, publishedAt);
  if (ageHours > options.maxHoursApart) {
    return null;
  }

  const clusterLocated = hasUsableLocation(cluster.anchor);
  const itemLocated = hasUsableLocation(item);
  const locationLinked = eventLocationMatch || regionMatch || countryMatch;
  if (!locationLinked && clusterLocated && itemLocated && ageHours > options.nearbyHoursThreshold) {
    return null;
  }

  const titleTokens = item.titleTokens?.length ? item.titleTokens : itemTokens;
  const summaryTokens = normalizeText(item.summary || item.normalizedSummary || "");
  const comparisonTokens = normalizeText(item.comparisonText || item.observedUpdate || "");
  const itemActionTokens = actionTokens(comparisonTokens.length ? comparisonTokens : titleTokens);

  const titleSimilarity = jaccardSimilarity(titleTokens, cluster.representativeTitleTokens);
  const summarySimilarity = jaccardSimilarity(summaryTokens, cluster.representativeSummaryTokens);
  const comparisonSimilarity = jaccardSimilarity(comparisonTokens, cluster.representativeComparisonTokens);
  const sharedActionTerms = jaccardSimilarity(itemActionTokens, cluster.representativeActionTokens);
  const incidentActorSimilarity = setSimilarity(item.incidentActorTokens, cluster.incidentActorTokens);
  const incidentTargetSimilarity = setSimilarity(item.incidentTargetTokens, cluster.incidentTargetTokens);
  const incidentLocationSimilarity = Math.max(
    locationSimilarityScore(eventLocationMatch, regionMatch, countryMatch),
    setSimilarity(item.incidentLocationTokens, cluster.incidentLocationTokens)
  );
  const incidentActionSimilarity = Math.max(
    sharedActionTerms,
    setSimilarity(item.incidentActionTokens, cluster.incidentActionTokens)
  );
  const incidentKeySimilarity = setSimilarity(item.incidentKeyTokens, cluster.incidentKeyTokens);
  const locationSimilarity = Math.max(
    locationSimilarityScore(eventLocationMatch, regionMatch, countryMatch),
    incidentLocationSimilarity
  );
  const locationActionScore = clamp(locationSimilarity * 0.6 + sharedActionTerms * 0.4, 0, 1);
  const sourceFamilyBonus = cluster.sourceFamilies.has(sourceFamilyFor(item)) ? 0 : 0.05;
  const locatedClusterBias =
    !hasUsableLocation(item) &&
    hasUsableLocation(cluster.anchor) &&
    incidentActorSimilarity >= 0.3 &&
    incidentTargetSimilarity >= 0.34 &&
    incidentActionSimilarity >= 0.18
      ? 0.06
      : 0;
  const locationVoidPenalty =
    !hasUsableLocation(item) &&
    !hasUsableLocation(cluster.anchor) &&
    incidentTargetSimilarity < 0.34
      ? 0.04
      : 0;
  const incidentScore = clamp(
    incidentLocationSimilarity * 0.34 +
      incidentActorSimilarity * 0.24 +
      incidentTargetSimilarity * 0.22 +
      incidentActionSimilarity * 0.2,
    0,
    1
  );
  const noLocationImpactMatch =
    incidentLocationSimilarity < 0.2 &&
    incidentActorSimilarity >= 0.3 &&
    incidentTargetSimilarity >= 0.5 &&
    incidentActionSimilarity >= 0.3 &&
    ageHours <= options.maxHoursApart;
  const strongIncidentMatch =
    incidentKeySimilarity >= 0.52 ||
    (
      incidentLocationSimilarity >= 0.45 &&
      (incidentActorSimilarity >= 0.28 || incidentTargetSimilarity >= 0.28) &&
      incidentActionSimilarity >= 0.18
    ) ||
    (
      incidentActorSimilarity >= 0.3 &&
      incidentTargetSimilarity >= 0.45 &&
      incidentActionSimilarity >= 0.3 &&
      ageHours <= options.nearbyHoursThreshold
    ) ||
    noLocationImpactMatch;

  const score =
    titleSimilarity * 0.3 +
    summarySimilarity * 0.14 +
    locationActionScore * 0.12 +
    comparisonSimilarity * 0.08 +
    incidentScore * 0.26 +
    incidentKeySimilarity * 0.1 +
    sourceFamilyBonus +
    locatedClusterBias -
    locationVoidPenalty;

  const acceptedWithLocation =
    score >= options.similarityThreshold ||
    (
      score >= options.secondaryThreshold &&
      (eventLocationMatch || regionMatch || incidentLocationSimilarity >= 0.45) &&
      ageHours <= options.nearbyHoursThreshold
    );
  const acceptedWithoutLocation =
    !categoryMatch.crossCategory &&
    !locationLinked &&
    ageHours <= options.nearbyHoursThreshold &&
    (
      (titleSimilarity >= 0.74 && comparisonSimilarity >= 0.74) ||
      strongIncidentMatch
    ) &&
    Math.max(Number(item.eventLikeness || 0), Number(cluster.representativeEventLikeness || 0)) >= 0.72 &&
    !cluster.representativeNoiseFlags?.genericRoundup &&
    !item.noiseFlags?.genericRoundup;
  const acceptedByIncident =
    strongIncidentMatch &&
    ageHours <= options.maxHoursApart &&
    (
      incidentScore >= 0.42 ||
      incidentKeySimilarity >= 0.45 ||
      (
        incidentActorSimilarity >= 0.34 &&
        incidentTargetSimilarity >= 0.34 &&
        incidentActionSimilarity >= 0.18
      )
    );
  const acceptedCrossCategory =
    categoryMatch.crossCategory &&
    acceptedByIncident &&
    (
      score >= options.crossCategoryThreshold ||
      incidentScore >= 0.48 ||
      comparisonSimilarity >= 0.34 ||
      titleSimilarity >= 0.3
    );
  const accepted =
    acceptedWithLocation ||
    acceptedWithoutLocation ||
    (!categoryMatch.crossCategory && acceptedByIncident) ||
    acceptedCrossCategory;

  return {
    accepted,
    score,
    ageHours,
    crossCategory: categoryMatch.crossCategory,
    eventLocationMatch,
    regionMatch,
    countryMatch,
    itemActionTokens,
    comparisonTokens,
    summaryTokens,
    titleTokens
  };
}

function clusterSupportScore(cluster) {
  const familyScore = cluster.sourceFamilies.size;
  const extraSameFamily = Math.max(0, cluster.sourceNames.size - cluster.sourceFamilies.size);
  return Number((familyScore + Math.min(0.5, extraSameFamily * 0.25)).toFixed(2));
}

export function buildClusters(items = [], options = {}) {
  const config = {
    similarityThreshold: options.similarityThreshold ?? 0.62,
    secondaryThreshold: options.secondaryThreshold ?? 0.55,
    crossCategoryThreshold: options.crossCategoryThreshold ?? 0.58,
    maxHoursApart: options.maxHoursApart ?? 6,
    nearbyHoursThreshold: options.nearbyHoursThreshold ?? 2
  };

  const sorted = [...items].sort(
    (a, b) => new Date(a.eventTime || a.published_at || 0) - new Date(b.eventTime || b.published_at || 0)
  );

  const clusters = [];

  for (const item of sorted) {
    const publishedAt = item.eventTime || item.published_at || new Date().toISOString();
    const itemText = item.comparisonText || `${item.observedUpdate || item.title || ""} ${item.summary || ""}`.trim();
    const itemTokens = item.titleTokens?.length ? item.titleTokens : normalizeText(itemText);

    let bestCluster = null;
    let bestMatch = null;

    for (const cluster of clusters) {
      const match = mergeScore(cluster, item, itemTokens, publishedAt, config);
      if (!match?.accepted) {
        continue;
      }

      const candidateLocated = hasUsableLocation(cluster.anchor);
      const bestLocated = bestCluster ? hasUsableLocation(bestCluster.anchor) : false;
      const preferLocatedCluster =
        !hasUsableLocation(item) &&
        candidateLocated &&
        !bestLocated &&
        bestMatch &&
        match.score >= bestMatch.score - 0.08;
      const preferRicherLocationCluster =
        !hasUsableLocation(item) &&
        candidateLocated &&
        bestLocated &&
        cluster.incidentLocationTokens.size > (bestCluster?.incidentLocationTokens.size || 0) &&
        bestMatch &&
        match.score >= bestMatch.score - 0.03;

      if (!bestMatch || match.score > bestMatch.score || preferLocatedCluster || preferRicherLocationCluster) {
        bestCluster = cluster;
        bestMatch = match;
      }
    }

    if (bestCluster && bestMatch) {
      bestCluster.items.push(item);
      bestCluster.itemIds.push(item.rawId ?? item.id);
      bestCluster.sourceNames.add(sourceNameFor(item));
      bestCluster.sourceFamilies.add(sourceFamilyFor(item));
      bestCluster.lastSeen = publishedAt;
      bestCluster.baseConfidences.push(Number(item.sourceConfidence || item.source_confidence || 0.55));
      bestCluster.corrections.push(item.correction || "None");
      bestCluster.maxSeverity = Math.max(bestCluster.maxSeverity, severityRank(item.severity || "LOW"));
      bestCluster.noiseScores.push(Number(item.noiseScore || 0));
      bestCluster.eventLikenessValues.push(Number(item.eventLikeness || 0));
      bestCluster.fieldRelevanceValues.push(Number(item.fieldRelevance || 0.5));
      bestCluster.escalationSignals.push(Number(item.escalationSignal || 0));
      bestCluster.mergeScores.push(bestMatch.score);
      bestCluster.weakItemCount += isWeakItem(item) ? 1 : 0;
      bestCluster.categoryCounts[item.category] = (bestCluster.categoryCounts[item.category] || 0) + 1;
      bestCluster.containsRoundupLikeItem ||= Boolean(item.noiseFlags?.genericRoundup);
      bestCluster.containsTranslatedItem ||= Boolean(item.translationApplied);
      bestCluster.regionMatchCount += item.region && item.region === bestCluster.region ? 1 : 0;
      updateRelevanceCounts(bestCluster, item);
      updateEscalationCounts(bestCluster, item);
      updateIncidentIdentity(bestCluster, item);

      if (shouldPromoteRepresentative(bestCluster, item)) {
        promoteRepresentative(bestCluster, item, bestMatch.titleTokens, bestMatch.itemActionTokens);
      }
    } else {
      const comparisonTokens = normalizeText(item.comparisonText || itemText);
      const itemActionTokens = actionTokens(comparisonTokens.length ? comparisonTokens : itemTokens);
      const cluster = {
        category: item.category,
        eventLocation: item.eventLocation || null,
        region: item.region || "Unknown",
        country: item.country || null,
        firstSeen: publishedAt,
        lastSeen: publishedAt,
        itemIds: [item.rawId ?? item.id],
        sourceNames: new Set([sourceNameFor(item)]),
        sourceFamilies: new Set([sourceFamilyFor(item)]),
        items: [item],
        anchor: {
          eventLocation: item.eventLocation || null,
          region: item.region || "Unknown",
          country: item.country || null
        },
        baseConfidences: [Number(item.sourceConfidence || item.source_confidence || 0.55)],
        corrections: [item.correction || "None"],
        maxSeverity: severityRank(item.severity || "LOW"),
        noiseScores: [Number(item.noiseScore || 0)],
        eventLikenessValues: [Number(item.eventLikeness || 0)],
        fieldRelevanceValues: [Number(item.fieldRelevance || 0.5)],
        escalationSignals: [Number(item.escalationSignal || 0)],
        mergeScores: [],
        weakItemCount: isWeakItem(item) ? 1 : 0,
        containsRoundupLikeItem: Boolean(item.noiseFlags?.genericRoundup),
        containsTranslatedItem: Boolean(item.translationApplied),
        regionMatchCount: item.region && item.region !== "Unknown" ? 1 : 0,
        categoryCounts: {
          [item.category]: 1
        },
        incidentActorTokens: new Set(item.incidentActorTokens || []),
        incidentTargetTokens: new Set(item.incidentTargetTokens || []),
        incidentLocationTokens: new Set(item.incidentLocationTokens || []),
        incidentActionTokens: new Set(item.incidentActionTokens || []),
        incidentKeyTokens: new Set(item.incidentKeyTokens || []),
        relevanceCounts: {},
        escalationCounts: {},
        representativeTitle: "",
        representativeSummary: "",
        representativeComparisonText: "",
        representativeTitleTokens: [],
        representativeSummaryTokens: [],
        representativeComparisonTokens: [],
        representativeActionTokens: [],
        representativeNoiseFlags: {},
        representativeNoiseScore: 0,
        representativeEventLikeness: 0,
        representativeRelevanceFlags: {},
        representativeFieldRelevance: 0.5,
        representativeEscalationFlags: {},
        representativeEscalationSignal: 0,
        representativeIncidentLocationTokens: [],
        representativeQuality: 0
      };

      updateRelevanceCounts(cluster, item);
      updateEscalationCounts(cluster, item);
      promoteRepresentative(cluster, item, itemTokens, itemActionTokens);
      clusters.push(cluster);
    }
  }

  return clusters
    .map((cluster) => {
      cluster.averageNoiseScore = average(cluster.noiseScores);
      cluster.maxEventLikeness = Math.max(...cluster.eventLikenessValues, 0);
      cluster.category = chooseClusterCategory(cluster);

      const sourceCount = cluster.sourceNames.size;
      const sourceFamilyCount = cluster.sourceFamilies.size;
      const severity =
        cluster.maxSeverity >= 3 ? "HIGH" : cluster.maxSeverity === 2 ? "MEDIUM" : "LOW";
      const confidence = Number(
        clusterConfidence(average(cluster.baseConfidences), cluster).toFixed(2)
      );
      const correction = cluster.corrections.some((value) => String(value).toLowerCase() !== "none")
        ? "Clarified"
        : "None";
      const regionConfidence = Number(
        clamp(cluster.regionMatchCount / Math.max(1, cluster.items.length)).toFixed(2)
      );
      const supportScore = clusterSupportScore(cluster);
      const representativeNoiseFlags = cluster.representativeNoiseFlags || {};
      const representativeRelevanceFlags = cluster.representativeRelevanceFlags || {};
      const representativeEscalationFlags = cluster.representativeEscalationFlags || {};
      const fieldRelevance = Number(
        Math.max(cluster.representativeFieldRelevance || 0, average(cluster.fieldRelevanceValues)).toFixed(2)
      );
      const maxEscalationSignal = Math.max(...cluster.escalationSignals, 0);
      const avgEscalationSignal = average(cluster.escalationSignals);
      const escalationFlags = {
        stateActorLike:
          representativeEscalationFlags.stateActorLike ||
          (cluster.escalationCounts.stateActorLike || 0) > 0,
        militaryActorLike:
          representativeEscalationFlags.militaryActorLike ||
          (cluster.escalationCounts.militaryActorLike || 0) > 0,
        defenseSecurityInstitutionLike:
          representativeEscalationFlags.defenseSecurityInstitutionLike ||
          (cluster.escalationCounts.defenseSecurityInstitutionLike || 0) > 0,
        crossBorderLike:
          representativeEscalationFlags.crossBorderLike ||
          (cluster.escalationCounts.crossBorderLike || 0) > 0,
        retaliationLanguageLike:
          representativeEscalationFlags.retaliationLanguageLike ||
          (cluster.escalationCounts.retaliationLanguageLike || 0) > 0,
        ceasefireBreakdownLike:
          representativeEscalationFlags.ceasefireBreakdownLike ||
          (cluster.escalationCounts.ceasefireBreakdownLike || 0) > 0,
        sanctionPolicyPressureLike:
          representativeEscalationFlags.sanctionPolicyPressureLike ||
          (cluster.escalationCounts.sanctionPolicyPressureLike || 0) > 0,
        mobilizationLike:
          representativeEscalationFlags.mobilizationLike ||
          (cluster.escalationCounts.mobilizationLike || 0) > 0,
        strategicInfrastructureTargetLike:
          representativeEscalationFlags.strategicInfrastructureTargetLike ||
          (cluster.escalationCounts.strategicInfrastructureTargetLike || 0) > 0,
        diplomaticCrisisLike:
          representativeEscalationFlags.diplomaticCrisisLike ||
          (cluster.escalationCounts.diplomaticCrisisLike || 0) > 0
      };
      const escalationSupportScore = Number(clamp(supportScore / 3, 0, 1).toFixed(2));
      const escalationAuthorityFactor = clamp(
        fieldRelevance * 0.45 +
          (escalationFlags.stateActorLike ? 0.12 : 0) +
          (escalationFlags.militaryActorLike ? 0.12 : 0) +
          (escalationFlags.defenseSecurityInstitutionLike ? 0.08 : 0) +
          (escalationFlags.crossBorderLike ? 0.12 : 0) +
          (escalationFlags.retaliationLanguageLike ? 0.12 : 0) +
          (escalationFlags.ceasefireBreakdownLike ? 0.1 : 0) +
          (escalationFlags.sanctionPolicyPressureLike ? 0.08 : 0) +
          (escalationFlags.mobilizationLike ? 0.1 : 0) +
          (escalationFlags.strategicInfrastructureTargetLike ? 0.12 : 0) +
          (escalationFlags.diplomaticCrisisLike ? 0.08 : 0),
        0,
        1
      );
      const escalationSignal = Number(
        clamp(
          maxEscalationSignal * 0.4 +
            avgEscalationSignal * 0.2 +
            escalationSupportScore * 0.2 +
            escalationAuthorityFactor * 0.2
        ).toFixed(2)
      );
      const weakCluster =
        sourceFamilyCount === 1 &&
        (
          cluster.weakItemCount >= 1 ||
          cluster.maxEventLikeness < 0.46 ||
          cluster.averageNoiseScore > 0.35 ||
          !hasUsableLocation(cluster)
        );

      return {
        cluster_id: makeClusterId(cluster),
        event_time: cluster.lastSeen,
        event_location: cluster.eventLocation || null,
        event_country: cluster.country || null,
        region: cluster.region,
        country: cluster.country,
        category: cluster.category,
        observed_update: cluster.representativeTitle,
        severity,
        confidence,
        source_count: sourceCount,
        source_family_count: sourceFamilyCount,
        support_score: supportScore,
        confirmation: confirmationLabel(sourceFamilyCount, sourceCount),
        correction,
        raw_item_ids: JSON.stringify(cluster.itemIds),
        source_names: [...cluster.sourceNames],
        source_families: [...cluster.sourceFamilies],
        noise_score_avg: Number(cluster.averageNoiseScore.toFixed(2)),
        event_likeness: Number(cluster.maxEventLikeness.toFixed(2)),
        region_confidence: regionConfidence,
        weak_item_count: cluster.weakItemCount,
        contains_roundup_like_item: cluster.containsRoundupLikeItem || representativeNoiseFlags.genericRoundup || false,
        contains_translated_item: cluster.containsTranslatedItem || false,
        representative_noise_flags: representativeNoiseFlags,
        field_relevance: fieldRelevance,
        escalation_signal: escalationSignal,
        escalation_support_score: escalationSupportScore,
        escalation_flags: escalationFlags,
        state_actor_like: escalationFlags.stateActorLike || representativeRelevanceFlags.stateActorLike || (cluster.relevanceCounts.stateActorLike || 0) > 0,
        cross_border_like: escalationFlags.crossBorderLike || representativeRelevanceFlags.crossBorderLike || (cluster.relevanceCounts.crossBorderLike || 0) > 0,
        military_actor_like: escalationFlags.militaryActorLike,
        defense_security_institution_like: escalationFlags.defenseSecurityInstitutionLike,
        retaliation_language_like: escalationFlags.retaliationLanguageLike,
        ceasefire_breakdown_like: escalationFlags.ceasefireBreakdownLike,
        sanction_policy_pressure_like: escalationFlags.sanctionPolicyPressureLike,
        mobilization_like: escalationFlags.mobilizationLike,
        strategic_infrastructure_target_like: escalationFlags.strategicInfrastructureTargetLike,
        diplomatic_crisis_like: escalationFlags.diplomaticCrisisLike,
        local_incident_like: (cluster.relevanceCounts.localIncidentLike || 0) > 0,
        municipal_utility_like: (cluster.relevanceCounts.municipalUtilityLike || 0) > 0,
        routine_traffic_collision_like: (cluster.relevanceCounts.routineTrafficCollisionLike || 0) > 0,
        local_crime_without_broader_context: (cluster.relevanceCounts.localCrimeWithoutBroaderContext || 0) > 0,
        low_field_authority: (cluster.relevanceCounts.lowFieldAuthority || 0) > 0,
        strategic_infrastructure_like: representativeRelevanceFlags.strategicInfrastructureLike || (cluster.relevanceCounts.strategicInfrastructureLike || 0) > 0,
        national_impact_like: representativeRelevanceFlags.nationalImpactLike || (cluster.relevanceCounts.nationalImpactLike || 0) > 0,
        representative_relevance_flags: representativeRelevanceFlags,
        representative_escalation_flags: representativeEscalationFlags,
        visible_in_tape: !weakCluster
      };
    })
    .sort((a, b) => new Date(b.event_time) - new Date(a.event_time));
}
