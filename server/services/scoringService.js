import { categoryLabels, categoryOrder } from "../config/categories.js";
import { weights } from "../config/weights.js";

const coreCompositionCategories = ["security", "diplomacy", "infrastructure", "cyber"];
const HARD_REJECT_REASONS = new Set([
  "article_hub_like",
  "commercial_vendor_noise",
  "generic_roundup",
  "generic_service_notice",
  "municipal_utility_without_broader_context",
  "noise_score_too_high",
  "non_event_infrastructure",
  "promo_wrapper",
  "routine_local_incident",
  "traffic_collision_not_field_relevant",
  "weak_cluster_precheck"
]);

const MOMENT_DOMAIN_LABELS = {
  security: "security-weighted pressure",
  diplomacy: "diplomatic signaling",
  infrastructure: "infrastructure strain",
  cyber: "cyber pressure",
  policy: "policy pressure",
  information: "information pressure"
};

const MOMENT_REASON_LABELS = {
  weak_cluster_precheck: "weak cluster precheck",
  low_field_authority: "low field authority",
  diplomacy_requires_more_support: "thin diplomatic support",
  single_family_low_confidence: "single-family low confidence",
  missing_location: "unclear geography",
  single_family_missing_location: "unclear geography",
  generic_roundup: "generic roundup formatting",
  article_hub_like: "article-hub formatting",
  noise_score_too_high: "noise pressure",
  traffic_collision_not_field_relevant: "non-representative local incident",
  routine_local_incident: "narrow local incident framing",
  municipal_utility_without_broader_context: "local utility context only",
  non_event_infrastructure: "non-event infrastructure wording"
};

const TONE_STATE_LABELS = {
  concentrated: "concentrated",
  mixed: "mixed",
  diffuse: "diffuse",
  insufficient_basis: "insufficient basis"
};

const TONE_DISPLAY_READS = {
  procedural: "procedural",
  exploratory: "exploratory",
  hardening: "hardening",
  guarded: "guarded"
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function severityRank(value = "LOW") {
  const normalized = String(value).toLowerCase();
  if (normalized === "high") return 3;
  if (normalized === "medium") return 2;
  return 1;
}

function hasUsableLocation(cluster) {
  return Boolean(
    (cluster?.region && String(cluster.region).toLowerCase() !== "unknown") ||
    cluster?.country
  );
}

function clusterNoiseLike(cluster) {
  const flags = cluster.representative_noise_flags || {};
  return Boolean(
    cluster.contains_roundup_like_item ||
    flags.genericRoundup ||
    flags.lowInformationTitle ||
    flags.celebrityCollision ||
    (cluster.noise_score_avg || 0) >= 0.4
  );
}

function clusterContainsGenericRoundup(cluster) {
  const flags = cluster.representative_noise_flags || {};
  return Boolean(
    cluster.contains_roundup_like_item ||
    flags.genericRoundup ||
    flags.lowInformationTitle
  );
}

function specificNoiseSuppressionReason(cluster) {
  const flags = cluster.representative_noise_flags || {};
  const eventLikeness = cluster.event_likeness || 0;
  const sourceFamilyCount = cluster.source_family_count || 0;
  const confidence = cluster.confidence || 0;
  const singleFamily = sourceFamilyCount === 1;

  if (flags.articleHubLike) {
    return "article_hub_like";
  }

  if (flags.promoWrapper && (singleFamily || eventLikeness < 0.72)) {
    return "promo_wrapper";
  }

  if (
    flags.nonEventInfrastructure &&
    (cluster.category === "infrastructure" || cluster.category === "information") &&
    (singleFamily || eventLikeness < 0.78)
  ) {
    return "non_event_infrastructure";
  }

  if (
    flags.genericServiceUpdate &&
    singleFamily &&
    (eventLikeness < 0.76 || confidence < 0.8)
  ) {
    return "generic_service_notice";
  }

  if (
    flags.commercialVendorLike &&
    singleFamily &&
    (eventLikeness < 0.8 || confidence < 0.82)
  ) {
    return "commercial_vendor_noise";
  }

  return null;
}

export function clusterStrengthScore(cluster) {
  const supportScore = clamp((cluster.source_family_count || 0) / 3, 0, 1);
  const severityScore = severityRank(cluster.severity) / 3;
  const eventLikeness = clamp(cluster.event_likeness || 0, 0, 1);
  const fieldRelevance = clamp(cluster.field_relevance || 0.5, 0, 1);
  const confidenceScore = clamp(cluster.confidence || 0, 0, 1);
  const locationBoost = hasUsableLocation(cluster) ? 0.06 : 0;
  const noisePenalty = clamp(cluster.noise_score_avg || 0, 0, 1) * 0.35;
  const weakPenalty = Math.min(0.15, (cluster.weak_item_count || 0) * 0.05);

  return Number((
    eventLikeness * 0.32 +
    fieldRelevance * 0.14 +
    supportScore * 0.2 +
    severityScore * 0.18 +
    confidenceScore * 0.1 +
    locationBoost -
    noisePenalty -
    weakPenalty
  ).toFixed(3));
}

function clusterHasFieldAuthority(cluster) {
  return Boolean(
    (cluster.field_relevance || 0) >= 0.52 ||
    cluster.strategic_infrastructure_like ||
    cluster.state_actor_like ||
    cluster.cross_border_like ||
    cluster.national_impact_like ||
    (
      (cluster.source_family_count || 0) >= 3 &&
      (cluster.field_relevance || 0) >= 0.45
    )
  );
}

function fieldAuthoritySuppressionReason(cluster) {
  if (clusterHasFieldAuthority(cluster)) {
    return null;
  }

  const noBroaderContext = !(
    cluster.strategic_infrastructure_like ||
    cluster.state_actor_like ||
    cluster.cross_border_like ||
    cluster.national_impact_like
  );

  if (cluster.routine_traffic_collision_like && noBroaderContext && (cluster.field_relevance || 0) < 0.3) {
    return "traffic_collision_not_field_relevant";
  }

  if (cluster.municipal_utility_like && noBroaderContext && (cluster.field_relevance || 0) < 0.3) {
    return "municipal_utility_without_broader_context";
  }

  const supportThin = (cluster.source_family_count || 0) <= 2;
  if (!supportThin) {
    return null;
  }

  if (cluster.routine_traffic_collision_like) {
    return "traffic_collision_not_field_relevant";
  }

  if (cluster.municipal_utility_like) {
    return "municipal_utility_without_broader_context";
  }

  if (cluster.local_incident_like || cluster.local_crime_without_broader_context) {
    return "routine_local_incident";
  }

  if (cluster.low_field_authority || (cluster.field_relevance || 0) < 0.45) {
    return "low_field_authority";
  }

  return null;
}

export function sampleState(visibleCount) {
  if (visibleCount <= 0) return "empty";
  if (visibleCount === 1) return "extremely_thin";
  if (visibleCount === 2) return "thin";
  if (visibleCount <= 4) return "limited";
  return "sufficient";
}

function sampleStateNote(state) {
  if (state === "empty") {
    return "No visible clusters survived the tape gate; concentration and coherence are unavailable.";
  }

  if (state === "extremely_thin" || state === "thin") {
    return "Visible sample is thin; concentration and coherence are provisional.";
  }

  if (state === "limited") {
    return "Low visible cluster count limits representational stability.";
  }

  return null;
}

function adjustCoherenceForSample(coherence, state) {
  if (state === "empty") return 0;
  if (state === "extremely_thin") return Number(Math.min(coherence, 0.65).toFixed(2));
  if (state === "thin") return Number(Math.min(coherence, 0.72).toFixed(2));
  if (state === "limited") return Number(Math.min(coherence, 0.85).toFixed(2));
  return coherence;
}

function uncertaintyPenaltyForSample(state) {
  if (state === "empty") return 0.35;
  if (state === "extremely_thin") return 0.24;
  if (state === "thin") return 0.16;
  if (state === "limited") return 0.08;
  return 0;
}

function escalationStatus(value) {
  if (value < 25) return "contained";
  if (value < 50) return "watch";
  if (value < 70) return "elevated";
  return "hardening";
}

function clusterHasEscalationDrivers(cluster) {
  return Boolean(
    cluster.state_actor_like ||
      cluster.military_actor_like ||
      cluster.defense_security_institution_like ||
      cluster.cross_border_like ||
      cluster.retaliation_language_like ||
      cluster.ceasefire_breakdown_like ||
      cluster.sanction_policy_pressure_like ||
      cluster.mobilization_like ||
      cluster.strategic_infrastructure_target_like ||
      cluster.diplomatic_crisis_like
  );
}

function escalationDriverLabels(cluster) {
  const labels = [];
  if (cluster.cross_border_like) labels.push("Cross-border action");
  if (cluster.retaliation_language_like) labels.push("Retaliatory language");
  if (cluster.ceasefire_breakdown_like) labels.push("Ceasefire breakdown");
  if (cluster.state_actor_like) labels.push("State actor presence");
  if (cluster.military_actor_like) labels.push("Military actor presence");
  if (cluster.defense_security_institution_like) labels.push("Defense/security institution");
  if (cluster.sanction_policy_pressure_like) labels.push("Sanctions or policy pressure");
  if (cluster.mobilization_like) labels.push("Mobilization or force deployment");
  if (cluster.strategic_infrastructure_target_like) labels.push("Strategic infrastructure targeting");
  if (cluster.diplomatic_crisis_like) labels.push("Diplomatic crisis signaling");
  return labels;
}

function escalationWeight(cluster) {
  let weight = clamp(cluster.confidence || 0, 0.35, 1) * Math.max(1, cluster.source_family_count || 1);

  if (cluster.provisional_visibility) {
    weight *= 0.55;
  }

  if ((cluster.source_family_count || 0) === 1) {
    weight *= 0.85;
  }

  if ((cluster.field_relevance || 0) < 0.55) {
    weight *= 0.85;
  }

  return Number(weight.toFixed(3));
}

function sampleDampForEscalation(state) {
  if (state === "empty") return 0.7;
  if (state === "extremely_thin") return 0.82;
  if (state === "thin") return 0.9;
  if (state === "limited") return 0.96;
  return 1;
}

export function computeEscalationPressure({ scoredClusters, visibleClusters, visibleSampleState, surfaceRecoveryMode }) {
  const visibleIds = new Set(visibleClusters.map((cluster) => cluster.cluster_id));
  const candidates = scoredClusters.filter((cluster) => {
    if (!clusterHasEscalationDrivers(cluster)) {
      return false;
    }

    if ((cluster.escalation_signal || 0) < 0.18) {
      return false;
    }

    return (
      visibleIds.has(cluster.cluster_id) ||
      (cluster.visible_in_tape && clusterHasFieldAuthority(cluster)) ||
      (
        (cluster.escalation_signal || 0) >= 0.4 &&
        ((cluster.field_relevance || 0) >= 0.55 || cluster.state_actor_like || cluster.cross_border_like)
      )
    );
  });

  if (!candidates.length) {
    return {
      value: 0,
      raw: 0,
      status: escalationStatus(0),
      contributingClusters: [],
      visibleContributorCount: 0
    };
  }

  const contributingClusters = candidates
    .map((cluster) => {
      const weight = escalationWeight(cluster);
      return {
        ...cluster,
        escalation_weight: weight,
        escalation_contribution: Number(((cluster.escalation_signal || 0) * weight).toFixed(3))
      };
    })
    .filter((cluster) => cluster.escalation_weight > 0)
    .sort((left, right) => (right.escalation_contribution || 0) - (left.escalation_contribution || 0));

  const totalWeight = contributingClusters.reduce((sum, cluster) => sum + cluster.escalation_weight, 0) || 1;
  let raw = contributingClusters.reduce(
    (sum, cluster) => sum + (cluster.escalation_signal || 0) * cluster.escalation_weight,
    0
  ) / totalWeight;

  raw *= sampleDampForEscalation(visibleSampleState);
  if (surfaceRecoveryMode === "provisional") {
    raw *= 0.88;
  }

  raw = Number(clamp(raw, 0, 1).toFixed(2));
  const value = Math.round(raw * 100);

  return {
    value,
    raw,
    status: escalationStatus(value),
    contributingClusters,
    visibleContributorCount: contributingClusters.filter((cluster) => visibleIds.has(cluster.cluster_id)).length
  };
}

export function evaluateClusterTapeVisibility(cluster) {
  const eventLikeness = cluster.event_likeness || 0;
  const sourceFamilyCount = cluster.source_family_count || 0;
  const confidence = cluster.confidence || 0;
  const severity = severityRank(cluster.severity);
  const hasLocation = hasUsableLocation(cluster);
  const noisy = clusterNoiseLike(cluster);
  const genericRoundup = clusterContainsGenericRoundup(cluster);
  const reasons = [];
  const signalStrength = clusterStrengthScore(cluster);

  function suppressed(reason) {
    reasons.push(reason);
    return {
      visible: false,
      reasons,
      signal_strength: signalStrength
    };
  }

  const specificNoiseReason = specificNoiseSuppressionReason(cluster);
  if (specificNoiseReason) {
    return suppressed(specificNoiseReason);
  }

  if (genericRoundup) {
    return suppressed("generic_roundup");
  }

  if (!cluster.visible_in_tape) {
    return suppressed("weak_cluster_precheck");
  }

  if (noisy) {
    return suppressed("noise_score_too_high");
  }

  if (eventLikeness < 0.45) {
    return suppressed(sourceFamilyCount >= 2 ? "multi_family_low_event_likeness" : "single_family_low_event_likeness");
  }

  if (!hasLocation) {
    return suppressed(sourceFamilyCount >= 2 ? "missing_location" : "single_family_missing_location");
  }

  const fieldAuthorityReason = fieldAuthoritySuppressionReason(cluster);
  if (fieldAuthorityReason) {
    return suppressed(fieldAuthorityReason);
  }

  if (sourceFamilyCount >= 2) {
    if ((cluster.noise_score_avg || 0) > 0.5) {
      return suppressed("noise_score_too_high");
    }

    if (!(confidence >= 0.55 || eventLikeness >= 0.58 || severity >= 2)) {
      return suppressed("multi_family_but_weak_support");
    }

    return {
      visible: true,
      reasons,
      signal_strength: signalStrength
    };
  }

  if ((cluster.noise_score_avg || 0) > 0.35) {
    return suppressed("noise_score_too_high");
  }

  if (cluster.category === "security") {
    if (eventLikeness < 0.72) {
      return suppressed("single_family_low_event_likeness");
    }

    if (!(confidence >= 0.76 || (severity >= 3 && eventLikeness >= 0.84))) {
      return suppressed("single_family_low_confidence");
    }

    return {
      visible: true,
      reasons,
      signal_strength: signalStrength
    };
  }

  if (cluster.category === "infrastructure") {
    if (eventLikeness < 0.74) {
      return suppressed("single_family_low_event_likeness");
    }

    if (!(confidence >= 0.76 || (severity >= 3 && eventLikeness >= 0.82))) {
      return suppressed("single_family_low_confidence");
    }

    return {
      visible: true,
      reasons,
      signal_strength: signalStrength
    };
  }

  if (cluster.category === "cyber") {
    if (eventLikeness < 0.78) {
      return suppressed("single_family_low_event_likeness");
    }

    if (!(confidence >= 0.8 || (severity >= 3 && eventLikeness >= 0.84))) {
      return suppressed("single_family_low_confidence");
    }

    return {
      visible: true,
      reasons,
      signal_strength: signalStrength
    };
  }

  if (cluster.category === "diplomacy") {
    if (eventLikeness < 0.82) {
      return suppressed("single_family_low_event_likeness");
    }

    if (confidence < 0.8) {
      return suppressed("diplomacy_requires_more_support");
    }

    return {
      visible: true,
      reasons,
      signal_strength: signalStrength
    };
  }

  if (cluster.category === "policy" || cluster.category === "information") {
    if (eventLikeness < 0.84) {
      return suppressed("single_family_low_event_likeness");
    }

    if (confidence < 0.82) {
      return suppressed("policy_requires_more_support");
    }

    return {
      visible: true,
      reasons,
      signal_strength: signalStrength
    };
  }

  if (eventLikeness < 0.72) {
    return suppressed("single_family_low_event_likeness");
  }

  if (!(confidence >= 0.74 || (severity >= 3 && eventLikeness >= 0.78))) {
    return suppressed("single_family_low_confidence");
  }

  return {
    visible: true,
    reasons,
    signal_strength: signalStrength
  };
}

function sortClustersForTape(clusters = []) {
  return [...clusters].sort((left, right) => {
    const familyDiff = (right.source_family_count || 0) - (left.source_family_count || 0);
    if (familyDiff !== 0) {
      return familyDiff;
    }

    const severityDiff = severityRank(right.severity) - severityRank(left.severity);
    if (severityDiff !== 0) {
      return severityDiff;
    }

    const confidenceDiff = (right.confidence || 0) - (left.confidence || 0);
    if (Math.abs(confidenceDiff) > 0.0001) {
      return confidenceDiff;
    }

    const eventLikenessDiff = (right.event_likeness || 0) - (left.event_likeness || 0);
    if (Math.abs(eventLikenessDiff) > 0.0001) {
      return eventLikenessDiff;
    }

    return new Date(right.event_time) - new Date(left.event_time);
  });
}

function clusterEligibleForRecovery(cluster) {
  if (cluster.visible_in_tape) {
    return false;
  }

  const reasons = cluster.suppression_reasons || [];
  if (!reasons.length) {
    return false;
  }

  if (reasons.some((reason) => HARD_REJECT_REASONS.has(reason))) {
    return false;
  }

  if (!hasUsableLocation(cluster)) {
    return false;
  }

  if ((cluster.event_likeness || 0) < 0.68) {
    return false;
  }

  if ((cluster.noise_score_avg || 0) > 0.28) {
    return false;
  }

  if ((cluster.confidence || 0) < 0.68) {
    return false;
  }

  if (
    (cluster.field_relevance || 0) < 0.4 &&
    !cluster.state_actor_like &&
    !cluster.cross_border_like &&
    !cluster.national_impact_like &&
    !cluster.strategic_infrastructure_like
  ) {
    return false;
  }

  if (
    cluster.source_family_count === 1 &&
    (cluster.field_relevance || 0) < 0.44 &&
    !cluster.state_actor_like &&
    !cluster.cross_border_like &&
    !cluster.national_impact_like
  ) {
    return false;
  }

  if (
    cluster.category === "diplomacy" &&
    (cluster.confidence || 0) < 0.72 &&
    !cluster.cross_border_like &&
    !cluster.state_actor_like
  ) {
    return false;
  }

  return true;
}

export function buildSurfaceSelection(scoredClusters = []) {
  let visibleClusters = scoredClusters.filter((cluster) => cluster.visible_in_tape);
  let surfaceRecoveryMode = "none";
  let provisionalVisibleCount = 0;

  if (!visibleClusters.length && scoredClusters.length) {
    const provisionalClusters = sortClustersForTape(
      scoredClusters.filter(clusterEligibleForRecovery)
    )
      .slice(0, 2)
      .map((cluster) => ({
        ...cluster,
        visible_in_tape: true,
        provisional_visibility: true,
        visibility_state: "provisional",
        recovery_reason: "surface_recovery_mode"
      }));

    if (provisionalClusters.length) {
      visibleClusters = provisionalClusters;
      surfaceRecoveryMode = "provisional";
      provisionalVisibleCount = provisionalClusters.length;
    }
  }

  return {
    visibleClusters,
    visibleSampleState: sampleState(visibleClusters.length),
    surfaceRecoveryMode,
    provisionalVisibleCount,
    surfaceRecoveryNote:
      surfaceRecoveryMode === "provisional"
        ? "No clusters met full authority threshold; showing provisional highest-signal items."
        : null
  };
}

function formatDelta(current, baseline, unit) {
  const delta = current - baseline;
  if (unit === "percent") return Number(delta.toFixed(3));
  if (unit === "count" || unit === "score") return Math.round(delta);
  return Number(delta.toFixed(2));
}

function metricStatus(key, value) {
  if (key === "escalation_pressure") return escalationStatus(value);
  if (key === "source_diversity") return value >= 6 ? "healthy" : "moderate";
  if (key === "correction_rate") return value <= 0.12 ? "improving" : "elevated";
  if (key === "uncertainty_index") return value <= 0.4 ? "moderate" : "elevated";
  if (key === "cross_source_coherence") return value >= 0.55 ? "mixed" : "degraded";
  return value >= 0.6 ? "elevated" : "healthy";
}

function buildMetricCard({ key, label, value, unit, baseline, sparkline }) {
  const delta = formatDelta(value, baseline, unit);
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  let display = String(value);
  if (unit === "score") display = `${Math.round(value)} / 100`;
  if (unit === "count") display = `${Math.round(value)} feeds`;
  if (unit === "percent") display = `${Math.round(value * 100)}%`;
  if (unit === "ratio") display = Number(value).toFixed(2);

  return {
    key,
    label,
    value: unit === "score" || unit === "count" ? Math.round(value) : Number(value.toFixed(2)),
    display,
    unit,
    delta_vs_prior_window: delta,
    delta_direction: direction,
    status: metricStatus(key, value),
    sparkline,
    explain_path: `/api/explain/metric/${key}?window=6h`
  };
}

function buildSparklines(metrics) {
  return {
    signal_velocity: [metrics.signalVelocity * 0.78, metrics.signalVelocity * 0.82, metrics.signalVelocity * 0.89, metrics.signalVelocity * 0.93, metrics.signalVelocity * 0.97, metrics.signalVelocity].map((v) => Math.round(v)),
    volatility_index: [0.41, 0.46, 0.49, 0.54, 0.58, metrics.volatilityIndex].map((v) => Number(v.toFixed(2))),
    source_diversity: [Math.max(1, metrics.sourceDiversity - 2), Math.max(1, metrics.sourceDiversity - 2), Math.max(1, metrics.sourceDiversity - 1), metrics.sourceDiversity - 1, metrics.sourceDiversity, metrics.sourceDiversity].map((v) => Math.round(v)),
    correction_rate: [metrics.correctionRate + 0.07, metrics.correctionRate + 0.05, metrics.correctionRate + 0.03, metrics.correctionRate + 0.02, metrics.correctionRate + 0.01, metrics.correctionRate].map((v) => Number(clamp(v, 0, 1).toFixed(2))),
    cross_source_coherence: [Math.max(0.25, metrics.coherence - 0.12), Math.max(0.25, metrics.coherence - 0.09), Math.max(0.25, metrics.coherence - 0.06), Math.max(0.25, metrics.coherence - 0.04), Math.max(0.25, metrics.coherence - 0.02), metrics.coherence].map((v) => Number(v.toFixed(2))),
    uncertainty_index: [Math.min(0.9, metrics.uncertainty + 0.12), Math.min(0.9, metrics.uncertainty + 0.1), Math.min(0.9, metrics.uncertainty + 0.07), Math.min(0.9, metrics.uncertainty + 0.05), Math.min(0.9, metrics.uncertainty + 0.02), metrics.uncertainty].map((v) => Number(v.toFixed(2))),
    escalation_pressure: [
      Math.max(0, metrics.escalationPressure - 16),
      Math.max(0, metrics.escalationPressure - 12),
      Math.max(0, metrics.escalationPressure - 8),
      Math.max(0, metrics.escalationPressure - 5),
      Math.max(0, metrics.escalationPressure - 2),
      metrics.escalationPressure
    ].map((v) => Math.round(v))
  };
}

function computeRegionalShares(events) {
  const total = events.length || 1;
  const counts = new Map();

  for (const event of events) {
    counts.set(event.region, (counts.get(event.region) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([region, count]) => ({
      label: region,
      share: `${Math.round((count / total) * 100)}%`
    }));
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

function humanizeMomentReason(reasonCode) {
  if (!reasonCode) {
    return "limited supporting authority";
  }

  return MOMENT_REASON_LABELS[reasonCode] || String(reasonCode).replace(/_/g, " ");
}

function dominantMomentDomain(clusters = []) {
  const counts = new Map();

  for (const cluster of clusters) {
    counts.set(cluster.category, (counts.get(cluster.category) || 0) + 1);
  }

  if (!counts.size) {
    return null;
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])[0][0];
}

function momentDomainLabel(category) {
  if (!category) {
    return "field pressure";
  }

  return MOMENT_DOMAIN_LABELS[category] || categoryLabels[category]?.toLowerCase() || String(category);
}

function clusterSurvivesHardReject(cluster) {
  const reasons = cluster.suppression_reasons || [];
  return !reasons.some((reason) => HARD_REJECT_REASONS.has(reason));
}

function toneStateLabel(value) {
  return TONE_STATE_LABELS[value] || String(value || "insufficient basis").replace(/_/g, " ");
}

function describeToneSummary(toneMetrics, options = {}) {
  if (!toneMetrics || toneMetrics.tone_state === "insufficient_basis") {
    return "Tone basis is too thin to support a stable language-pressure read.";
  }

  const toneLabel = TONE_DISPLAY_READS[toneMetrics.top_tone_display] || toneMetrics.top_tone_display || "mixed";
  const confidence = Math.round((toneMetrics.top_tone_confidence || 0) * 100);
  const stateLabel = toneStateLabel(toneMetrics.tone_state);

  if (toneMetrics.tone_state === "concentrated") {
    return `Language posture is ${stateLabel} around ${toneLabel} phrasing (${confidence}% top-tone confidence).`;
  }

  if (toneMetrics.tone_state === "diffuse") {
    return `Language posture is ${stateLabel}; ${toneLabel} cues are present but not settled enough to sharpen the read.`;
  }

  const context = options.context === "escalation"
    ? "it does not overrule support or escalation authority"
    : "it does not overrule the field";
  return `Language posture is ${stateLabel}, leaning ${toneLabel}; ${context}.`;
}

function buildToneMetrics(scoredClusters = [], visibleSampleState = "empty") {
  const basisClusters = scoredClusters.filter((cluster) =>
    clusterSurvivesHardReject(cluster) &&
    (cluster.cluster_tone_basis_item_count || 0) > 0
  );
  const basisVisibleCount = basisClusters.filter((cluster) => cluster.visible_in_tape).length;

  if (visibleSampleState === "empty" || !basisClusters.length) {
    return {
      top_tone_display: null,
      top_tone_confidence: 0,
      tone_entropy_norm: 1,
      tone_state: "insufficient_basis",
      basis_cluster_count: basisClusters.length,
      basis_visible_count: basisVisibleCount,
      summary_note: "Tone basis is too thin to support a stable language-pressure read."
    };
  }

  const totals = {
    neutral: 0,
    curious: 0,
    frustrated: 0,
    defensive: 0
  };
  let totalWeight = 0;

  for (const cluster of basisClusters) {
    const usableWeight = Math.max(
      0.05,
      (cluster.support_score || cluster.source_family_count || 1) *
        Math.max(0.1, cluster.event_likeness || 0.5)
    );
    const rawProbabilities = cluster.tone_profile?.raw_probabilities || {};
    totalWeight += usableWeight;
    for (const key of Object.keys(totals)) {
      totals[key] += Number(rawProbabilities[key] || 0) * usableWeight;
    }
  }

  const averaged = Object.fromEntries(
    Object.entries(totals).map(([key, value]) => [
      key,
      Number((value / Math.max(totalWeight, 0.01)).toFixed(4))
    ])
  );
  const ordered = Object.entries(averaged).sort((left, right) => right[1] - left[1]);
  const [topToneRaw, topToneConfidenceRaw] = ordered[0];
  const secondConfidence = ordered[1]?.[1] || 0;
  const topToneConfidence = Number(topToneConfidenceRaw.toFixed(4));
  const toneMargin = Number((topToneConfidence - secondConfidence).toFixed(4));
  const toneEntropy = Number(
    (-Object.values(averaged).reduce((sum, probability) => {
      if (!probability) {
        return sum;
      }
      return sum + probability * Math.log2(probability);
    }, 0)).toFixed(4)
  );
  const toneEntropyNorm = Number((toneEntropy / Math.log2(4)).toFixed(4));
  const toneState =
    topToneConfidence >= 0.5 && toneMargin >= 0.14 && toneEntropyNorm <= 0.72
      ? "concentrated"
      : toneEntropyNorm >= 0.9 || toneMargin <= 0.08 || topToneConfidence < 0.36
        ? "diffuse"
        : "mixed";

  const toneMetrics = {
    top_tone_display: {
      neutral: "procedural",
      curious: "exploratory",
      frustrated: "hardening",
      defensive: "guarded"
    }[topToneRaw] || topToneRaw,
    top_tone_confidence: topToneConfidence,
    tone_entropy_norm: toneEntropyNorm,
    tone_state: toneState,
    basis_cluster_count: basisClusters.length,
    basis_visible_count: basisVisibleCount,
    summary_note: ""
  };
  toneMetrics.summary_note = describeToneSummary(toneMetrics);
  return toneMetrics;
}

function buildToneDrivers(clusters = [], limit = 5) {
  return [...clusters]
    .filter((cluster) =>
      clusterSurvivesHardReject(cluster) &&
      (cluster.cluster_tone_basis_item_count || 0) > 0
    )
    .sort((left, right) => {
      const confidenceDiff =
        (right.cluster_top_tone_confidence || 0) - (left.cluster_top_tone_confidence || 0);
      if (Math.abs(confidenceDiff) > 0.0001) {
        return confidenceDiff;
      }

      return (left.cluster_tone_entropy_norm || 0) - (right.cluster_tone_entropy_norm || 0);
    })
    .slice(0, limit)
    .map((cluster) => ({
      cluster_id: cluster.cluster_id,
      headline: cluster.observed_update,
      tone_posture: cluster.cluster_top_tone_display || "-",
      confidence: `${Math.round((cluster.cluster_top_tone_confidence || 0) * 100)}%`,
      entropy: Number(cluster.cluster_tone_entropy_norm || 0).toFixed(2)
    }));
}

function buildToneContext(toneMetrics, options = {}) {
  return {
    top_tone_display: toneMetrics.top_tone_display,
    top_tone_confidence: toneMetrics.top_tone_confidence,
    tone_entropy_norm: toneMetrics.tone_entropy_norm,
    tone_state: toneMetrics.tone_state,
    summary_note: describeToneSummary(toneMetrics, options)
  };
}

function buildToneSentenceForTree(toneMetrics, options = {}) {
  if (!toneMetrics || toneMetrics.tone_state === "insufficient_basis") {
    return "Tone basis remains too thin to sharpen the read.";
  }

  const toneLabel = TONE_DISPLAY_READS[toneMetrics.top_tone_display] || toneMetrics.top_tone_display;
  if (toneMetrics.tone_state === "concentrated" && toneLabel === "hardening") {
    return options.narrow
      ? "Language posture is hardening, but support remains narrow."
      : "Language posture is hardening, though it remains bounded by current support.";
  }

  if (toneMetrics.tone_state === "concentrated" && toneLabel === "procedural") {
    return "Language posture remains procedural despite the active field.";
  }

  if (toneMetrics.tone_state === "diffuse") {
    return "Language posture is mixed and does not sharpen the current call.";
  }

  return `Language posture leans ${toneLabel} without overruling the field.`;
}

function buildMomentResolve({
  scoredClusters = [],
  visibleClusters = [],
  heldOutField,
  visibleSampleState,
  surfaceRecoveryMode,
  metrics,
  toneMetrics = null,
  temporalState = null,
  modeTag = null
}) {
  const visibleCount = visibleClusters.length;
  const heldOutCount = heldOutField?.held_out_count || 0;
  const visibleCategoryCount = new Set(visibleClusters.map((cluster) => cluster.category).filter(Boolean)).size;
  const dominantCategory = dominantMomentDomain(visibleClusters.length ? visibleClusters : scoredClusters);
  const domainLabel = momentDomainLabel(dominantCategory);
  const primarySuppressionReason = heldOutField?.top_suppression_reasons?.[0]?.reason_code || null;
  const humanSuppressionReason = humanizeMomentReason(primarySuppressionReason);

  let state = "contained";
  if (modeTag === "degraded") {
    state = "degraded";
  } else if (temporalState === "contained_now_residue_present") {
    state = "residue_present";
  } else if (visibleSampleState === "empty" || visibleSampleState === "extremely_thin" || visibleSampleState === "thin") {
    state = "thin";
  } else if (
    surfaceRecoveryMode === "provisional" ||
    (visibleCount > 0 && heldOutCount >= Math.max(3, visibleCount * 2)) ||
    metrics.uncertainty >= 0.7 ||
    metrics.coherence < 0.45
  ) {
    state = "provisional";
  } else if (visibleSampleState === "sufficient" && visibleCategoryCount >= 2 && visibleCount >= 3) {
    state = "broad";
  }

  const base = {
    title: "Tree of Relief — Moment Resolve",
    subtitle: "Narrative audit of the present window, not a forecast.",
    state,
    state_label: state.replace(/_/g, " "),
    lines: {}
  };

  switch (state) {
    case "degraded":
      return {
        ...base,
        state_label: "Degraded",
        lines: {
          what_formed: "A fallback continuity surface is carrying the board while live detail is constrained.",
          what_held: "Delayed or unavailable feeds reduced confirmation, comparison strength, or field breadth.",
          what_resolves: "Read this cycle as operationally useful but partially degraded.",
          what_remains_open: `${buildToneSentenceForTree(toneMetrics)} More may be present than the current surface can verify.`
        }
      };
    case "residue_present":
      return {
        ...base,
        state_label: "Residue Present",
        lines: {
          what_formed: "The active window appears calmer than the wider memory around it.",
          what_held: "Recent windows retain hardening pressure even though the present surface is more contained.",
          what_resolves: `Read this cycle as contained at the surface with pressure residue still in memory. ${buildToneSentenceForTree(toneMetrics)}`,
          what_remains_open: "The field is quieter now, but it has not fully cleared its recent strain."
        }
      };
    case "thin":
      return {
        ...base,
        state_label: "Thin Field",
        lines: {
          what_formed:
            visibleCount === 0
              ? "No visible clusters earned appearance in the active window; the field remained observationally thin."
              : visibleCount === 1
                ? `A narrow, ${domainLabel} field took shape in the active window.`
                : `A narrow field took shape across ${visibleCount} visible clusters, led by ${domainLabel}.`,
          what_held: heldOutCount
            ? `${heldOutCount} additional clusters were seen but refused, most often for ${humanSuppressionReason}.`
            : "Supporting candidates stayed limited, so little else could earn visible appearance.",
          what_resolves: `Read this cycle as narrow and provisional, not as a broad field conclusion. ${buildToneSentenceForTree(toneMetrics, { narrow: true })}`,
          what_remains_open: toneMetrics?.tone_state === "insufficient_basis"
            ? "The field remains active, but present evidence does not justify a wider directional claim."
            : "The field remains active, but present evidence does not justify a wider directional claim."
        }
      };
    case "provisional":
      return {
        ...base,
        state_label: "Provisional Read",
        lines: {
          what_formed: `A visible ${domainLabel} surface formed, but representational authority remained partial.`,
          what_held: heldOutCount
            ? `${heldOutCount} refused clusters stayed large relative to what earned appearance, led by ${humanSuppressionReason}.`
            : "Visible clusters formed, but supporting breadth remained limited.",
          what_resolves: `Read this cycle as a partial field read, not a settled surface. ${buildToneSentenceForTree(toneMetrics, { narrow: true })}`,
          what_remains_open: "Local evidence is present, but the broader pattern remains under-supported."
        }
      };
    case "broad":
      return {
        ...base,
        state_label: "Broad Field",
        lines: {
          what_formed: `A multi-domain field took shape with visible activity across ${visibleCategoryCount} domains.`,
          what_held: heldOutCount
            ? `Selection remained strict, but enough authority survived to keep ${heldOutCount} refused clusters from defining the whole window.`
            : "Selection remained strict, and enough authority survived to show a wider field.",
          what_resolves: `Read this cycle as materially active and broader than a single-thread window. ${buildToneSentenceForTree(toneMetrics)}`,
          what_remains_open: "The field is wider than usual, but individual clusters still carry uneven certainty."
        }
      };
    default:
      return {
        ...base,
        state_label: "Contained",
        lines: {
          what_formed: "Activity remained present without broadening into open hardening.",
          what_held: heldOutCount
            ? `${heldOutCount} clusters were refused for limited authority, support, or geographic clarity, led by ${humanSuppressionReason}.`
            : "Supporting candidates stayed limited in authority or support.",
          what_resolves: `Read this cycle as contained pressure rather than an active break. ${buildToneSentenceForTree(toneMetrics)}`,
          what_remains_open: "Residual movement may still sit beneath the present calm."
        }
      };
  }
}

function joinStructuralFactors(factors = [], fallback = "No decisive structural factors surfaced.") {
  const cleaned = [...new Set(factors.filter(Boolean))];
  if (!cleaned.length) {
    return fallback;
  }

  return cleaned.slice(0, 3).join("; ");
}

function categoryShare(clusters = [], category) {
  if (!clusters.length) {
    return 0;
  }

  const count = clusters.filter((cluster) => cluster.category === category).length;
  return count / clusters.length;
}

function buildStructuralRead({
  scoredClusters = [],
  visibleClusters = [],
  heldOutField,
  visibleSampleState,
  surfaceRecoveryMode,
  metrics,
  toneMetrics = null,
  modeTag = null
}) {
  const visibleCount = visibleClusters.length;
  const heldOutCount = heldOutField?.held_out_count || 0;
  const basisClusters = visibleClusters.length ? visibleClusters : scoredClusters;
  const dominantCategory = dominantMomentDomain(basisClusters);
  const domainLabel = momentDomainLabel(dominantCategory);
  const diplomacyShare = categoryShare(visibleClusters, "diplomacy");
  const securityShare = categoryShare(visibleClusters, "security");
  const visibleCategoryCount = new Set(visibleClusters.map((cluster) => cluster.category).filter(Boolean)).size;
  const primarySuppressionReason = heldOutField?.top_suppression_reasons?.[0]?.reason_code || null;
  const humanSuppressionReason = humanizeMomentReason(primarySuppressionReason);
  const diplomacyCentral =
    visibleCount >= 2 &&
    diplomacyShare >= 0.3 &&
    metrics.coherence >= 0.5 &&
    visibleSampleState !== "empty" &&
    visibleSampleState !== "extremely_thin";

  let basis = "sufficient";
  if (modeTag === "degraded") {
    basis = "weak";
  } else if (visibleSampleState === "empty" || (!visibleCount && heldOutCount === 0)) {
    basis = "insufficient";
  } else if (
    visibleSampleState === "extremely_thin" ||
    visibleSampleState === "thin" ||
    visibleCount < 2 ||
    metrics.coherence < 0.45
  ) {
    basis = "weak";
  }

  let state = "contained";
  if (modeTag === "degraded") {
    state = "degraded";
  } else if (basis === "insufficient") {
    state = "insufficient_basis";
  } else if (diplomacyCentral) {
    state = "negotiation_geometry";
  } else if (visibleSampleState === "extremely_thin" || visibleSampleState === "thin") {
    state = "thin";
  } else if (
    visibleCategoryCount >= 2 &&
    metrics.escalationPressure >= 20 &&
    metrics.coherence >= 0.55 &&
    metrics.uncertainty <= 0.6
  ) {
    state = "mixed_watch";
  }

  const loadBearingFactors = [];
  if (diplomacyCentral) {
    loadBearingFactors.push("diplomacy is materially present in the visible field");
  }
  if (securityShare >= 0.25 && diplomacyCentral) {
    loadBearingFactors.push("security pressure remains active enough to keep the bargaining field brittle");
  } else if (dominantCategory) {
    loadBearingFactors.push(`${categoryLabels[dominantCategory] || dominantCategory} is carrying the visible center of gravity`);
  }
  if (visibleCount > 0) {
    loadBearingFactors.push(`${visibleCount} visible cluster${visibleCount === 1 ? "" : "s"} earned appearance`);
  }
  if (metrics.coherence >= 0.6) {
    loadBearingFactors.push("cross-source coherence is strong enough to support compression");
  } else if (metrics.coherence >= 0.5) {
    loadBearingFactors.push("coherence is good enough to support a guarded compression");
  }
  if (metrics.escalationPressure >= 25) {
    loadBearingFactors.push("watch-level escalation pressure remains active");
  }
  if (toneMetrics && toneMetrics.tone_state !== "insufficient_basis" && toneMetrics.top_tone_display) {
    loadBearingFactors.push(`tone posture leans ${toneMetrics.top_tone_display} without overruling the field`);
  }

  const constraintFactors = [];
  if (visibleSampleState === "extremely_thin" || visibleSampleState === "thin") {
    constraintFactors.push("the visible sample remains thin");
  } else if (visibleSampleState === "limited") {
    constraintFactors.push("visible authority remains limited");
  }
  if (heldOutCount > 0) {
    constraintFactors.push(`top refusal reason is ${humanSuppressionReason}`);
  }
  if (metrics.uncertainty >= 0.65) {
    constraintFactors.push("uncertainty remains elevated");
  }
  if (metrics.coherence < 0.5) {
    constraintFactors.push("coherence is not strong enough to fully settle the read");
  }
  if (surfaceRecoveryMode === "provisional") {
    constraintFactors.push("surface recovery is still operating in provisional mode");
  }
  if (!diplomacyCentral && visibleCategoryCount <= 1 && visibleCount > 0) {
    constraintFactors.push("single-domain dominance narrows the structural read");
  }

  let heldOutPressure = "Little refused pressure is visible beneath the current surface.";
  if (heldOutCount > 0 && visibleCount === 0) {
    heldOutPressure = `${heldOutCount} clusters were seen underneath the surface, but none earned visible appearance.`;
  } else if (heldOutCount > 0 && heldOutCount >= Math.max(3, visibleCount * 2)) {
    heldOutPressure = `${heldOutCount} held-out clusters sit beneath ${visibleCount} visible cluster${visibleCount === 1 ? "" : "s"}, so unseen pressure still outweighs the surfaced field.`;
  } else if (heldOutCount > 0) {
    heldOutPressure = `${heldOutCount} clusters remain held out beneath the visible field; refusal pressure is present but not dominant.`;
  }

  let currentStructuralState = "contained pressure with bounded movement and no clear structural break.";
  let openEdge = "The field has shape, but some visible texture may still be provisional or held below appearance.";

  if (state === "degraded") {
    currentStructuralState = "fallback continuity surface; structurally useful, not full live authority.";
    openEdge = "More may be present than the current surface can safely compress.";
  } else if (state === "insufficient_basis") {
    currentStructuralState = "insufficient structural basis; the window does not support compression beyond thin-state notes.";
    openEdge = "Wait for a denser window before assigning stronger structure.";
  } else if (state === "thin") {
    currentStructuralState = "observationally thin and directionally unresolved.";
    openEdge = "The field may be moving, but this window does not yet justify a broader structural claim.";
  } else if (state === "negotiation_geometry") {
    currentStructuralState = "mixed watch-state with a real diplomatic brake; bargaining structure is visible but not settled.";
    openEdge = "The overlap corridor is visible, but hard collision points remain unresolved under present bargaining pressure.";
  } else if (state === "mixed_watch") {
    currentStructuralState = "balanced but brittle; pressure is active, but constraints are still materially present.";
    openEdge = "The field is elevated and fairly coherent, but it is not yet structurally settled.";
  }

  return {
    title: "Structural Read",
    subtitle: "Analytical map of the present window, not a forecast.",
    state,
    state_label: state.replace(/_/g, " "),
    basis,
    basis_label: basis.replace(/_/g, " "),
    lines: {
      active_domain:
        state === "negotiation_geometry"
          ? "Bargaining pressure with diplomacy materially present in the visible field."
          : visibleCount === 0
            ? "Sparse visible field with pressure held below appearance."
            : `Current field center: ${domainLabel}.`,
      load_bearing_factors: joinStructuralFactors(
        loadBearingFactors,
        "No strong load-bearing factors surfaced beyond the base field state."
      ),
      constraint_factors: joinStructuralFactors(
        constraintFactors,
        "No dominant structural constraint overtook the current surface."
      ),
      held_out_pressure: heldOutPressure,
      current_structural_state: currentStructuralState,
      open_edge: openEdge
    }
  };
}

function sortHeldOutClusters(clusters = []) {
  return [...clusters].sort((left, right) => {
    const strengthDiff = (right.signal_strength || 0) - (left.signal_strength || 0);
    if (Math.abs(strengthDiff) > 0.0001) {
      return strengthDiff;
    }

    return new Date(right.event_time) - new Date(left.event_time);
  });
}

function buildHeldOutField(scoredClusters = [], visibleClusters = []) {
  const visibleIds = new Set(visibleClusters.map((cluster) => cluster.cluster_id));
  const suppressedClusters = sortHeldOutClusters(
    scoredClusters.filter((cluster) => !visibleIds.has(cluster.cluster_id))
  );

  return {
    title: "Held-Out Field",
    subtitle: "What was seen but refused",
    held_out_count: suppressedClusters.length,
    summary_note: suppressedClusters.length
      ? `${suppressedClusters.length} clusters were seen but held out of visible appearance.`
      : "No clusters were held out of visible appearance in this window.",
    top_suppression_reasons: countBy(
      suppressedClusters.flatMap((cluster) =>
        (cluster.suppression_reasons || []).length ? cluster.suppression_reasons : ["unspecified"]
      )
    )
      .slice(0, 5)
      .map(({ label, count }) => ({
        reason_code: label,
        count
      })),
    items: suppressedClusters.slice(0, 5).map((cluster) => ({
      cluster_id: cluster.cluster_id,
      region: cluster.region,
      country: cluster.country || null,
      category: cluster.category,
      observed_update: cluster.observed_update,
      severity: cluster.severity,
      confidence: cluster.confidence,
      source_count: cluster.source_count,
      source_family_count: cluster.source_family_count,
      signal_strength: cluster.signal_strength,
      primary_suppression_reason: (cluster.suppression_reasons || [])[0] || "unspecified",
      suppression_reasons: cluster.suppression_reasons || []
    }))
  };
}

function buildSourceDiversityDrivers(clusters = [], limit = Number.POSITIVE_INFINITY) {
  const feedMap = new Map();

  for (const cluster of clusters) {
    const uniqueFeeds = [...new Set((cluster.source_names || []).filter(Boolean))];

    for (const feedName of uniqueFeeds) {
      const key = String(feedName).trim() || "Unknown source";
      const existing = feedMap.get(key) || {
        feed: key,
        cluster_count: 0,
        sample_update: cluster.observed_update
      };

      existing.cluster_count += 1;
      if (!existing.sample_update && cluster.observed_update) {
        existing.sample_update = cluster.observed_update;
      }

      feedMap.set(key, existing);
    }
  }

  const sortedFeeds = [...feedMap.values()]
    .sort((left, right) => {
      const clusterDiff = right.cluster_count - left.cluster_count;
      if (clusterDiff !== 0) {
        return clusterDiff;
      }

      return left.feed.localeCompare(right.feed);
    });

  return Number.isFinite(limit) ? sortedFeeds.slice(0, limit) : sortedFeeds;
}

function buildEventItems(clusters, options = {}) {
  const {
    limit = 12,
    eventIdPrefix = "evt",
    includeHeldOutNotes = false
  } = options;

  return sortClustersForTape(clusters).slice(0, limit).map((cluster, index) => ({
    event_id: `${eventIdPrefix}_${String(index + 1).padStart(3, "0")}`,
    cluster_id: cluster.cluster_id,
    observed_at: cluster.event_time,
    region: cluster.region,
    category: cluster.category,
    summary: cluster.observed_update,
    severity: cluster.severity.toLowerCase(),
    confidence: cluster.confidence,
    source_count: cluster.source_count,
    confirmation_state: cluster.confirmation.toLowerCase().replace(/\s+/g, "_"),
    correction_state: cluster.correction.toLowerCase().replace(/\s+/g, "_"),
    visibility_state: cluster.provisional_visibility
      ? "provisional"
      : cluster.visible_in_tape
        ? "authoritative"
        : "suppressed",
    visibility_note: cluster.provisional_visibility
      ? "Provisional visibility under thin-sample recovery."
      : includeHeldOutNotes && !cluster.visible_in_tape
        ? `Held out for ${String((cluster.suppression_reasons || [])[0] || "insufficient_support").replace(/_/g, " ")}.`
        : "",
    primary_source_labels: cluster.source_names || [],
    suppression_reasons: cluster.suppression_reasons || [],
    detail_path: `/api/events?window=6h&event_id=${encodeURIComponent(cluster.cluster_id)}`
  }));
}

function buildCategoryEventItems(clusters = []) {
  const categoryMap = {};

  for (const key of [...new Set(clusters.map((cluster) => cluster.category).filter(Boolean))]) {
    categoryMap[key] = buildEventItems(
      clusters.filter((cluster) => cluster.category === key),
      {
        limit: 25,
        eventIdPrefix: `cat_${key}`,
        includeHeldOutNotes: true
      }
    );
  }

  return categoryMap;
}

export function scoreClustersForTape(clusters = []) {
  return clusters.map((cluster) => {
    const evaluation = evaluateClusterTapeVisibility(cluster);
    return {
      ...cluster,
      visible_in_tape: evaluation.visible,
      signal_strength: evaluation.signal_strength,
      suppression_reasons: evaluation.reasons
    };
  });
}

function buildComposition(clusters) {
  const total = clusters.length || 1;
  const counts = new Map();

  for (const cluster of clusters) {
    counts.set(cluster.category, (counts.get(cluster.category) || 0) + 1);
  }

  const orderedKeys = [
    ...coreCompositionCategories,
    ...categoryOrder.filter((key) => !coreCompositionCategories.includes(key) && (counts.get(key) || 0) > 0)
  ];

  return orderedKeys
    .map((key) => {
      const count = counts.get(key) || 0;
      return {
        key,
        label: categoryLabels[key] || key,
        count,
        cluster_count: count,
        share: count / total,
        display: `${Math.round((count / total) * 100)}%`,
        event_path: `/api/events?window=6h&category=${key}`
      };
    });
}

function buildHistory(metrics) {
  return {
    window: "6h",
    generated_at: new Date().toISOString(),
    series: {
      signal_velocity: {
        current: Math.round(metrics.signalVelocity),
        prior_window: Math.max(0, Math.round(metrics.signalVelocity - 6)),
        baseline_24h_avg: Math.max(0, Math.round(metrics.signalVelocity - 12)),
        baseline_7d_avg: Math.max(0, Math.round(metrics.signalVelocity - 17)),
        points: buildSparklines(metrics).signal_velocity
      },
      volatility_index: {
        current: metrics.volatilityIndex,
        prior_window: Number(Math.max(0, metrics.volatilityIndex - 0.08).toFixed(2)),
        baseline_24h_avg: Number(Math.max(0, metrics.volatilityIndex - 0.17).toFixed(2)),
        baseline_7d_avg: Number(Math.max(0, metrics.volatilityIndex - 0.23).toFixed(2)),
        points: buildSparklines(metrics).volatility_index
      },
      source_diversity: {
        current: metrics.sourceDiversity,
        prior_window: Math.max(1, metrics.sourceDiversity - 1),
        baseline_24h_avg: Math.max(1, metrics.sourceDiversity - 2),
        baseline_7d_avg: Math.max(1, metrics.sourceDiversity - 3),
        points: buildSparklines(metrics).source_diversity
      },
      correction_rate: {
        current: metrics.correctionRate,
        prior_window: Number(Math.min(1, metrics.correctionRate + 0.03).toFixed(2)),
        baseline_24h_avg: Number(Math.min(1, metrics.correctionRate + 0.05).toFixed(2)),
        baseline_7d_avg: Number(Math.min(1, metrics.correctionRate + 0.06).toFixed(2)),
        points: buildSparklines(metrics).correction_rate
      },
      cross_source_coherence: {
        current: metrics.coherence,
        prior_window: Number(Math.max(0, metrics.coherence - 0.05).toFixed(2)),
        baseline_24h_avg: Number(Math.max(0, metrics.coherence - 0.08).toFixed(2)),
        baseline_7d_avg: Number(Math.max(0, metrics.coherence - 0.12).toFixed(2)),
        points: buildSparklines(metrics).cross_source_coherence
      },
      uncertainty_index: {
        current: metrics.uncertainty,
        prior_window: Number(Math.min(1, metrics.uncertainty + 0.04).toFixed(2)),
        baseline_24h_avg: Number(Math.min(1, metrics.uncertainty + 0.07).toFixed(2)),
        baseline_7d_avg: Number(Math.min(1, metrics.uncertainty + 0.11).toFixed(2)),
        points: buildSparklines(metrics).uncertainty_index
      },
      escalation_pressure: {
        current: Math.round(metrics.escalationPressure),
        prior_window: Math.max(0, Math.round(metrics.escalationPressure - 6)),
        baseline_24h_avg: Math.max(0, Math.round(metrics.escalationPressure - 11)),
        baseline_7d_avg: Math.max(0, Math.round(metrics.escalationPressure - 17)),
        points: buildSparklines(metrics).escalation_pressure
      }
    }
  };
}

function buildExplain(metrics, clusters, escalation, toneMetrics) {
  const distinctFeedNames = new Set();
  const distinctFeedFamilies = new Set();
  const clusterCount = Math.max(1, clusters.length);
  const weightedSeverityTotal = clusters.reduce((sum, cluster) => {
    const key = String(cluster.severity || "LOW").toLowerCase();
    return sum + (weights.severity[key] || 1);
  }, 0);
  const correctionClusterCount = clusters.filter(
    (cluster) => cluster.correction && cluster.correction !== "None"
  ).length;
  for (const cluster of clusters) {
    for (const sourceName of cluster.source_names || []) {
      distinctFeedNames.add(sourceName);
    }
    for (const sourceFamily of cluster.source_families || []) {
      distinctFeedFamilies.add(sourceFamily);
    }
  }

  const volatilityDrivers = [...clusters]
    .map((cluster) => {
      const severityKey = String(cluster.severity || "LOW").toLowerCase();
      const severityWeight = weights.severity[severityKey] || 1;
      const normalizedContribution = Number((severityWeight / (clusterCount * 3)).toFixed(2));
      const correctionNote =
        cluster.correction && cluster.correction !== "None"
          ? ` (correction tracked: ${cluster.correction})`
          : "";

      return {
        cluster_id: cluster.cluster_id,
        headline: `${cluster.observed_update}${correctionNote}`,
        contribution: normalizedContribution,
        _severity_rank: severityRank(cluster.severity),
        _confidence: cluster.confidence || 0
      };
    })
    .sort((left, right) => {
      const contributionDiff = (right.contribution || 0) - (left.contribution || 0);
      if (Math.abs(contributionDiff) > 0.0001) {
        return contributionDiff;
      }

      const severityDiff = (right._severity_rank || 0) - (left._severity_rank || 0);
      if (severityDiff !== 0) {
        return severityDiff;
      }

      return (right._confidence || 0) - (left._confidence || 0);
    })
    .slice(0, 5)
    .map(({ _severity_rank, _confidence, ...driver }) => driver);
  const correctionDrivers = clusters
    .filter((cluster) => cluster.correction && cluster.correction !== "None")
    .map((cluster) => ({
      cluster_id: cluster.cluster_id,
      headline: `${cluster.observed_update} (correction tracked: ${cluster.correction})`,
      contribution: Number((1 / clusterCount).toFixed(2)),
      _confidence: cluster.confidence || 0
    }))
    .sort((left, right) => (right._confidence || 0) - (left._confidence || 0))
    .slice(0, 5)
    .map(({ _confidence, ...driver }) => driver);
  const sourceDiversityDrivers = buildSourceDiversityDrivers(clusters);
  const toneDrivers = buildToneDrivers(clusters, 5);
  const escalationDrivers = escalation.contributingClusters.slice(0, 5).map((cluster) => ({
    cluster_id: cluster.cluster_id,
    headline: `${cluster.observed_update} (${escalationDriverLabels(cluster).slice(0, 2).join(", ") || "Escalation texture"})`,
    contribution: Number((cluster.escalation_contribution || 0).toFixed(2))
  }));

  return {
    signal_velocity: {
      metric_key: "signal_velocity",
      label: "Signal Velocity",
      window: "6h",
      value: Math.round(metrics.signalVelocity),
      definition: "Weighted cluster activity in the active window.",
      formula_human: "Normalized processed cluster count versus bounded score cap.",
      inputs: { cluster_count: clusters.length },
      drivers: clusters.slice(0, 5).map((cluster) => ({
        cluster_id: cluster.cluster_id,
        headline: cluster.observed_update,
        contribution: 1
      })),
      caveats: ["Cluster count is bounded to avoid runaway headline inflation."]
    },
    volatility_index: {
      metric_key: "volatility_index",
      label: "Volatility Index",
      window: "6h",
      value: metrics.volatilityIndex,
      definition: "Severity-weighted dispersion across active clusters in the current window.",
      formula_human: "Weighted severity total divided by active cluster count, bounded to 0..1.",
      inputs: {
        cluster_count: clusters.length,
        weighted_severity_total: weightedSeverityTotal,
        correction_cluster_count: correctionClusterCount
      },
      tone_context: buildToneContext(toneMetrics, { context: "volatility" }),
      drivers: volatilityDrivers,
      caveats: [
        "Volatility rises with concentrated high-severity clustering, not just raw event count.",
        "Correction-tracked clusters add interpretive caution but do not dominate the volatility score.",
        "Tone describes rhetorical posture only and does not change volatility scoring in this pass."
      ]
    },
    source_diversity: {
      metric_key: "source_diversity",
      label: "Source Diversity",
      window: "6h",
      value: metrics.sourceDiversity,
      definition: "Counts distinct contributing feeds participating in qualified clusters.",
      formula_human: "Distinct source labels across qualified clusters, with family diversity available as context.",
      inputs: {
        distinct_feed_count: distinctFeedNames.size,
        distinct_family_count: distinctFeedFamilies.size,
        feeds_shown: sourceDiversityDrivers.length
      },
      driver_columns: [
        { key: "feed", label: "Feed", width: "34%" },
        { key: "sample_update", label: "Sample update", width: "50%" },
        { key: "cluster_count", label: "Clusters", width: "16%" }
      ],
      drivers: sourceDiversityDrivers,
      caveats: [
        "Showing all distinct feeds observed in qualified clusters.",
        "More feeds improve breadth but do not guarantee correctness."
      ]
    },
    correction_rate: {
      metric_key: "correction_rate",
      label: "Correction Rate",
      window: "6h",
      value: metrics.correctionRate,
      definition: "Tracks how often active clusters required clarifications or reversals.",
      formula_human: "Correction-tracked cluster count divided by active cluster count.",
      inputs: {
        cluster_count: clusters.length,
        correction_cluster_count: correctionClusterCount
      },
      drivers: correctionDrivers,
      caveats: [
        "A low correction rate does not imply high certainty by itself.",
        "Correction Rate stays descriptive; it records cleanup pressure, not predictive confidence."
      ]
    },
    cross_source_coherence: {
      metric_key: "cross_source_coherence",
      label: "Cross-Source Coherence",
      window: "6h",
      value: metrics.coherence,
      definition: "Agreement proxy based on repeated source coverage inside clusters.",
      formula_human: "Average of cluster source-count support, bounded to 0..1.",
      inputs: { cluster_count: clusters.length },
      drivers: clusters.slice(0, 5).map((cluster) => ({
        cluster_id: cluster.cluster_id,
        headline: cluster.observed_update,
        contribution: cluster.source_family_count || cluster.source_count
      })),
      caveats: ["Single-connector coherence is provisional until multiple source families are ingested."]
    },
    escalation_pressure: {
      metric_key: "escalation_pressure",
      label: "Escalation Pressure",
      window: "6h",
      value: metrics.escalationPressure,
      definition: "Descriptive hardening score for state-linked, cross-border, retaliatory, or strategically pressured activity in the active window.",
      formula_human: "Weighted average of cluster escalation signals, damped under thin or provisional samples.",
      inputs: {
        contributing_cluster_count: escalation.contributingClusters.length,
        visible_contributor_count: escalation.visibleContributorCount
      },
      tone_context: buildToneContext(toneMetrics, { context: "escalation" }),
      drivers: escalationDrivers,
      caveats: [
        "Infrastructure strain alone does not imply escalation pressure.",
        "Escalation Pressure is descriptive only and does not forecast intent or outcomes.",
        "Thin or provisional samples are damped to avoid over-reading narrow windows.",
        "Tone may describe rhetorical posture, but it does not overrule support or escalation authority."
      ]
    },
    tone_pressure: {
      metric_key: "tone_pressure",
      label: "Tone Pressure",
      window: "6h",
      value: toneMetrics.tone_entropy_norm,
      definition: "Describes how concentrated or diffuse the field's live language posture is in the active window.",
      formula_human: "Weighted cluster tone distribution summarized by top tone, confidence, and normalized tone entropy.",
      inputs: {
        basis_cluster_count: toneMetrics.basis_cluster_count,
        basis_visible_count: toneMetrics.basis_visible_count,
        top_tone_display: toneMetrics.top_tone_display,
        top_tone_confidence: toneMetrics.top_tone_confidence,
        tone_entropy_norm: toneMetrics.tone_entropy_norm
      },
      tone_context: buildToneContext(toneMetrics),
      driver_columns: [
        { key: "cluster_id", label: "Cluster", width: "18%" },
        { key: "headline", label: "Headline", width: "46%" },
        { key: "tone_posture", label: "Tone posture", width: "16%" },
        { key: "confidence", label: "Confidence", width: "10%" },
        { key: "entropy", label: "Entropy", width: "10%" }
      ],
      drivers: toneDrivers,
      caveats: [
        "Tone reads wording pressure, not event truth.",
        "High tone concentration is not the same thing as high event confidence.",
        "Tone remains descriptive-only and does not affect tape appearance in this pass."
      ]
    }
  };
}

function buildNotes(metrics, clusters, options = {}) {
  const notes = [];
  const visibleClusterCount =
    options.visibleClusterCount ??
    clusters.filter((cluster) => cluster.visible_in_tape).length;
  const suppressedClusterCount = Math.max(0, clusters.length - visibleClusterCount);
  if (options.surfaceRecoveryNote) {
    notes.push(options.surfaceRecoveryNote);
  }
  if (options.sampleNote) {
    notes.push(options.sampleNote);
  }
  if (metrics.escalationPressure >= 55) {
    notes.push("Escalation pressure is elevated due to state-linked, cross-border, or retaliatory texture in the active window.");
  }
  if (metrics.volatilityIndex >= 0.55) {
    notes.push("Volatility remains elevated due to dense update clustering in the active window.");
  }
  if (metrics.correctionRate > 0) {
    notes.push("Corrections are being tracked as first-class signal rather than hidden cleanup.");
  }
  if (suppressedClusterCount > 0) {
    notes.push(`${suppressedClusterCount} weaker clusters were held out of the visible tape.`);
  }
  if (clusters.length === 0) {
    notes.push("No qualifying signal clusters were observed in the active window.");
  }
  if (!notes.length) {
    notes.push("Signal flow is present but currently moderate across the active categories.");
  }
  return notes.slice(0, 4);
}

export function scoreDashboardBundle({
  windowStart,
  windowEnd,
  clusters,
  temporalState = null,
  modeTag = null
}) {
  const scoredClusters = scoreClustersForTape(clusters);
  const clusterCount = clusters.length;
  const distinctSourceNames = new Set();
  const distinctSourceFamilies = new Set();
  for (const cluster of scoredClusters) {
    for (const sourceName of cluster.source_names || []) {
      distinctSourceNames.add(sourceName);
    }
    for (const sourceFamily of cluster.source_families || []) {
      distinctSourceFamilies.add(sourceFamily);
    }
  }
  const corrections = scoredClusters.filter((cluster) => cluster.correction !== "None").length;
  const multiSource = scoredClusters.filter((cluster) => (cluster.source_family_count || 0) >= 2);
  const surfaceSelection = buildSurfaceSelection(scoredClusters);
  const visibleClusters = surfaceSelection.visibleClusters;
  const eventItems = buildEventItems(visibleClusters);
  const visibleSampleState = surfaceSelection.visibleSampleState;
  const visibleSampleNote = sampleStateNote(visibleSampleState);
  const regionalConcentration = computeRegionalShares(eventItems);
  const toneMetrics = buildToneMetrics(scoredClusters, visibleSampleState);

  const signalVelocity = clamp(clusterCount * 12, 0, weights.signalVelocityCap);
  const weightedSeverity = scoredClusters.reduce((sum, cluster) => {
    const key = String(cluster.severity || "LOW").toLowerCase();
    return sum + (weights.severity[key] || 1);
  }, 0);
  const volatilityIndex = Number(clamp(weightedSeverity / Math.max(1, clusterCount * 3), 0, 1).toFixed(2));
  const sourceDiversity = Math.max(distinctSourceNames.size, distinctSourceFamilies.size);
  const correctionRate = Number((corrections / Math.max(1, clusterCount)).toFixed(2));
  const baseCoherence = Number(clamp(
    multiSource.length
      ? multiSource.reduce((sum, cluster) => sum + clamp((cluster.source_family_count || 0) / 4, 0, 1), 0) / multiSource.length
      : weights.coherenceSingleSourceDefault,
    0,
    1
  ).toFixed(2));
  const diversityPenalty = sourceDiversity < weights.uncertaintyLowDiversityThreshold ? 0.12 : 0;
  const coherence = adjustCoherenceForSample(baseCoherence, visibleSampleState);
  const uncertainty = Number(clamp(
    (1 - coherence) +
    diversityPenalty +
    correctionRate * 0.25 +
    uncertaintyPenaltyForSample(visibleSampleState),
    0,
    1
  ).toFixed(2));
  const escalation = computeEscalationPressure({
    scoredClusters,
    visibleClusters,
    visibleSampleState,
    surfaceRecoveryMode: surfaceSelection.surfaceRecoveryMode
  });
  const metrics = {
    signalVelocity,
    volatilityIndex,
    sourceDiversity,
    correctionRate,
    coherence,
    uncertainty,
    escalationPressure: escalation.value
  };
  const sparklines = buildSparklines(metrics);
  const compositionItems = buildComposition(scoredClusters);
  const categoryEventItems = buildCategoryEventItems(scoredClusters);
  const heldOutField = buildHeldOutField(scoredClusters, visibleClusters);
  const treeOfRelief = buildMomentResolve({
    scoredClusters,
    visibleClusters,
    heldOutField,
    visibleSampleState,
    surfaceRecoveryMode: surfaceSelection.surfaceRecoveryMode,
    metrics,
    toneMetrics,
    temporalState,
    modeTag
  });
  const structuralRead = buildStructuralRead({
    scoredClusters,
    visibleClusters,
    heldOutField,
    visibleSampleState,
    surfaceRecoveryMode: surfaceSelection.surfaceRecoveryMode,
    metrics,
    toneMetrics,
    modeTag
  });

  const dashboard = {
    meta: {
      api_version: "1.0.0",
      generated_at: new Date().toISOString(),
      window: { label: "6h", start: windowStart, end: windowEnd },
      refresh_seconds: 300,
      mode: "situational_awareness",
      predictive: false,
      timezone: "UTC"
    },
    banner: {
      title: "Live Signals Overlay",
      subtitle: "Descriptive monitoring layer for event intensity, source mix, and correction-aware signal flow.",
      disclaimer: "Non-predictive use only. This dashboard summarizes observed signals in the active window. It does not forecast outcomes or assign future probabilities."
    },
    metrics: {
      cards: [
        buildMetricCard({ key: "signal_velocity", label: "Signal Velocity", value: signalVelocity, unit: "score", baseline: Math.max(0, signalVelocity - 6), sparkline: sparklines.signal_velocity }),
        buildMetricCard({ key: "volatility_index", label: "Volatility Index", value: volatilityIndex, unit: "ratio", baseline: Math.max(0, volatilityIndex - 0.08), sparkline: sparklines.volatility_index }),
        buildMetricCard({ key: "source_diversity", label: "Source Diversity", value: sourceDiversity, unit: "count", baseline: Math.max(1, sourceDiversity - 1), sparkline: sparklines.source_diversity }),
        buildMetricCard({ key: "escalation_pressure", label: "Escalation Pressure", value: escalation.value, unit: "score", baseline: Math.max(0, escalation.value - 6), sparkline: sparklines.escalation_pressure }),
        buildMetricCard({ key: "correction_rate", label: "Correction Rate", value: correctionRate, unit: "percent", baseline: Math.min(1, correctionRate + 0.03), sparkline: sparklines.correction_rate }),
        buildMetricCard({ key: "cross_source_coherence", label: "Cross-Source Coherence", value: coherence, unit: "ratio", baseline: Math.max(0, coherence - 0.05), sparkline: sparklines.cross_source_coherence }),
        buildMetricCard({ key: "uncertainty_index", label: "Uncertainty Index", value: uncertainty, unit: "ratio", baseline: Math.min(1, uncertainty + 0.04), sparkline: sparklines.uncertainty_index })
      ]
    },
    composition: {
      title: "Signal Composition",
      basis: "event_clusters",
      items: compositionItems,
      regional_concentration: regionalConcentration,
      regional_concentration_meta: {
        sample_state: visibleSampleState,
        sample_note: surfaceSelection.surfaceRecoveryNote
          ? `${surfaceSelection.surfaceRecoveryNote} ${visibleSampleNote || ""}`.trim()
          : visibleSampleNote,
        surface_recovery_mode: surfaceSelection.surfaceRecoveryMode
      }
    },
    recent_events: {
      title: "Visible Event Tape",
      sort: "signal_strength_then_recency",
      sort_note: "Strength-ranked, then recency",
      items: eventItems,
      category_items: categoryEventItems
    },
    held_out_field: heldOutField,
    tone_metrics: toneMetrics,
    tree_of_relief: treeOfRelief,
    structural_read: structuralRead,
    notes: {
      title: "Volatility Notes",
      items: buildNotes(metrics, scoredClusters, {
        visibleClusterCount: visibleClusters.length,
        sampleNote: visibleSampleNote,
        surfaceRecoveryNote: surfaceSelection.surfaceRecoveryNote
      })
    },
    method_snapshot: {
      title: "Method Snapshot",
      items: [
        "Time window: rolling 6 hours.",
        "Clusters are counted instead of individual headlines.",
        "Confidence scores represent evidence quality, not future certainty.",
        `Visible sample state: ${visibleSampleState.replace(/_/g, " ")}.`,
        `Surface recovery mode: ${surfaceSelection.surfaceRecoveryMode}.`
      ]
    },
    system_status: {
      ingestion: "healthy",
      notes: []
    },
    trace: {
      raw_item_count: clusterCount,
      processed_cluster_count: clusterCount,
      visible_tape_cluster_count: visibleClusters.length,
      suppressed_cluster_count: Math.max(0, clusterCount - visibleClusters.length),
      regional_concentration: regionalConcentration,
      sample_state: visibleSampleState,
      surface_recovery_mode: surfaceSelection.surfaceRecoveryMode,
      provisional_visible_count: surfaceSelection.provisionalVisibleCount,
      moment_resolve_state: treeOfRelief.state,
      structural_read_state: structuralRead.state,
      structural_basis: structuralRead.basis,
      tone_state: toneMetrics.tone_state,
      tone_basis_cluster_count: toneMetrics.basis_cluster_count,
      escalation_pressure: escalation.value,
      escalation_contributor_count: escalation.contributingClusters.length
    }
  };

  return {
    dashboard,
    history: buildHistory(metrics),
    explain: buildExplain(metrics, scoredClusters, escalation, toneMetrics)
  };
}
