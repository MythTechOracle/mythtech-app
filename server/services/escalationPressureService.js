import { loadRawItemsForWindow } from "../db/db.js";
import { normalizeRawItems } from "./normalizationService.js";
import { buildClusters } from "./clusteringService.js";
import {
  buildSurfaceSelection,
  computeEscalationPressure,
  scoreClustersForTape,
  scoreDashboardBundle
} from "./scoringService.js";

function toIsoWindow(windowHours = 6) {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowHours * 60 * 60 * 1000);
  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString()
  };
}

function statusRank(status = "contained") {
  const normalized = String(status || "contained").toLowerCase();
  if (normalized === "hardening") return 3;
  if (normalized === "elevated") return 2;
  if (normalized === "watch") return 1;
  return 0;
}

function summarizeTemporalWindow(audit) {
  return {
    window: `${audit.window_hours}h`,
    value: audit.current_value,
    display: audit.current_display,
    status: audit.current_status,
    contributor_count: audit.escalation_contributor_count,
    visible_contributor_count: audit.visible_escalation_contributor_count,
    sample_state: audit.visible_sample_state
  };
}

function classifyTemporalRead(current6h, residue24h, continuity72h) {
  const currentRank = statusRank(current6h.status);
  const residueRank = statusRank(residue24h.status);
  const continuityRank = statusRank(continuity72h.status);
  const widerRank = Math.max(residueRank, continuityRank);
  const widerValue = Math.max(residue24h.value || 0, continuity72h.value || 0);

  if (currentRank === 0 && widerRank === 0) {
    return {
      temporal_state: "contained_all_windows",
      temporal_note: "Contained across active and wider windows.",
      summary_temporal:
        "Escalation is contained in the active window and remains contained across recent and wider windows."
    };
  }

  if (currentRank === 0 && widerRank > 0) {
    return {
      temporal_state: "contained_now_residue_present",
      temporal_note: "Contained now; recent windows still show hardening residue.",
      summary_temporal:
        "Escalation is contained in the active window, but wider windows still carry recent hardening residue."
    };
  }

  if (currentRank >= 2) {
    if (widerRank > 0) {
      return {
        temporal_state: "hardening_now",
        temporal_note: "Hardening now; wider windows confirm continuity.",
        summary_temporal:
          "Hardening is active in the current window and remains present across wider windows."
      };
    }

    return {
      temporal_state: "hardening_now",
      temporal_note: "Hardening now; wider-window continuity is not yet established.",
      summary_temporal:
        "Hardening is active in the current window, but wider windows do not yet show the same pressure."
    };
  }

  if (currentRank === 1 && widerRank > currentRank && (current6h.value || 0) + 8 <= widerValue) {
    return {
      temporal_state: "cooling_from_watch",
      temporal_note: "Cooling now; wider windows still hold stronger pressure.",
      summary_temporal:
        "Escalation pressure is easing in the active window, but recent and wider windows still carry a stronger watch-state residue."
    };
  }

  if (currentRank === 1 && widerRank >= 1) {
    return {
      temporal_state: "watch_now_persistent",
      temporal_note: "Watch now; pressure persists across wider windows.",
      summary_temporal:
        "Escalation is active in the current window and remains persistent across recent and wider windows."
    };
  }

  if (currentRank === 1) {
    return {
      temporal_state: "watch_now_localized",
      temporal_note: "Watch now; limited wider-window continuity.",
      summary_temporal:
        "Escalation is active in the current window without strong persistence across wider windows."
    };
  }

  return {
    temporal_state: "contained_now_residue_present",
    temporal_note: "Contained now; recent windows still show hardening residue.",
    summary_temporal:
      "Escalation is contained in the active window, but wider windows still carry recent hardening residue."
  };
}

function summarizeContributor(cluster, visibleIds) {
  return {
    cluster_id: cluster.cluster_id,
    event_time: cluster.event_time,
    region: cluster.region,
    country: cluster.country || null,
    category: cluster.category,
    observed_update: cluster.observed_update,
    severity: cluster.severity,
    confidence: cluster.confidence,
    source_family_count: cluster.source_family_count,
    field_relevance: cluster.field_relevance,
    escalation_signal: cluster.escalation_signal,
    escalation_weight: cluster.escalation_weight,
    escalation_contribution: cluster.escalation_contribution,
    visible_on_tape: visibleIds.has(cluster.cluster_id),
    suppression_reasons: cluster.suppression_reasons || [],
    flags: {
      state_actor_like: Boolean(cluster.state_actor_like),
      military_actor_like: Boolean(cluster.military_actor_like),
      defense_security_institution_like: Boolean(cluster.defense_security_institution_like),
      cross_border_like: Boolean(cluster.cross_border_like),
      retaliation_language_like: Boolean(cluster.retaliation_language_like),
      ceasefire_breakdown_like: Boolean(cluster.ceasefire_breakdown_like),
      sanction_policy_pressure_like: Boolean(cluster.sanction_policy_pressure_like),
      mobilization_like: Boolean(cluster.mobilization_like),
      strategic_infrastructure_target_like: Boolean(cluster.strategic_infrastructure_target_like),
      diplomatic_crisis_like: Boolean(cluster.diplomatic_crisis_like)
    }
  };
}

function pickStrainWithoutHardeningExample(scoredClusters, visibleIds) {
  const candidates = scoredClusters
    .filter((cluster) => cluster.category === "infrastructure")
    .filter(
      (cluster) =>
        !cluster.state_actor_like &&
        !cluster.military_actor_like &&
        !cluster.cross_border_like &&
        !cluster.retaliation_language_like &&
        !cluster.ceasefire_breakdown_like &&
        !cluster.sanction_policy_pressure_like &&
        !cluster.mobilization_like &&
        !cluster.strategic_infrastructure_target_like
    )
    .sort((left, right) => {
      const confidenceDiff = (right.confidence || 0) - (left.confidence || 0);
      if (Math.abs(confidenceDiff) > 0.0001) {
        return confidenceDiff;
      }

      const familyDiff = (right.source_family_count || 0) - (left.source_family_count || 0);
      if (familyDiff !== 0) {
        return familyDiff;
      }

      return (right.escalation_signal || 0) - (left.escalation_signal || 0);
    });

  if (!candidates.length) {
    return null;
  }

  return summarizeContributor(candidates[0], visibleIds);
}

function pickHardeningExample(contributingClusters, visibleIds) {
  const preferred = contributingClusters
    .filter(
      (cluster) =>
        cluster.category !== "infrastructure" &&
        (
          cluster.state_actor_like ||
          cluster.military_actor_like ||
          cluster.cross_border_like ||
          cluster.retaliation_language_like ||
          cluster.ceasefire_breakdown_like ||
          cluster.sanction_policy_pressure_like ||
          cluster.mobilization_like ||
          cluster.diplomatic_crisis_like
        )
    )
    .sort((left, right) => (right.escalation_contribution || 0) - (left.escalation_contribution || 0));

  const selected = preferred[0] || contributingClusters[0] || null;
  return selected ? summarizeContributor(selected, visibleIds) : null;
}

export async function buildEscalationPressureAudit(windowHours = 6) {
  const { windowStart, windowEnd } = toIsoWindow(windowHours);
  const rawItems = loadRawItemsForWindow(windowStart, windowEnd);
  const normalizedRows = await normalizeRawItems(rawItems);
  const clusters = buildClusters(normalizedRows);
  const scoredClusters = scoreClustersForTape(clusters);
  const surfaceSelection = buildSurfaceSelection(scoredClusters);
  const visibleIds = new Set(surfaceSelection.visibleClusters.map((cluster) => cluster.cluster_id));
  const escalation = computeEscalationPressure({
    scoredClusters,
    visibleClusters: surfaceSelection.visibleClusters,
    visibleSampleState: surfaceSelection.visibleSampleState,
    surfaceRecoveryMode: surfaceSelection.surfaceRecoveryMode
  });
  const bundle = scoreDashboardBundle({
    windowStart,
    windowEnd,
    clusters
  });
  const escalationCard = bundle.dashboard.metrics.cards.find(
    (card) => card.key === "escalation_pressure"
  ) || null;
  const explain = bundle.explain?.escalation_pressure || null;
  const visibleContributors = escalation.contributingClusters
    .filter((cluster) => visibleIds.has(cluster.cluster_id))
    .map((cluster) => summarizeContributor(cluster, visibleIds));
  const suppressedContributors = escalation.contributingClusters
    .filter((cluster) => !visibleIds.has(cluster.cluster_id))
    .map((cluster) => summarizeContributor(cluster, visibleIds));

  return {
    ok: true,
    window_hours: windowHours,
    window_start: windowStart,
    window_end: windowEnd,
    current_value: escalationCard?.value ?? escalation.value,
    current_display: escalationCard?.display ?? `${escalation.value} / 100`,
    current_status: escalationCard?.status ?? escalation.status,
    raw_item_count: rawItems.length,
    processed_cluster_count: scoredClusters.length,
    visible_tape_cluster_count: surfaceSelection.visibleClusters.length,
    visible_sample_state: surfaceSelection.visibleSampleState,
    surface_recovery_mode: surfaceSelection.surfaceRecoveryMode,
    escalation_contributor_count: escalation.contributingClusters.length,
    visible_escalation_contributor_count: visibleContributors.length,
    suppressed_escalation_contributor_count: suppressedContributors.length,
    top_contributing_clusters: escalation.contributingClusters
      .slice(0, 5)
      .map((cluster) => summarizeContributor(cluster, visibleIds)),
    top_explain_drivers: explain?.drivers || [],
    visible_contributors: visibleContributors.slice(0, 5),
    suppressed_contributors: suppressedContributors.slice(0, 5),
    strain_without_hardening_example: pickStrainWithoutHardeningExample(scoredClusters, visibleIds),
    hardening_without_infrastructure_dominance_example: pickHardeningExample(
      escalation.contributingClusters,
      visibleIds
    ),
    notes: [
      "Escalation Pressure is descriptive only; it does not forecast conflict outcomes.",
      "Visible and suppressed escalation contributors are computed from the same scoring path as /api/dashboard.",
      "strain_without_hardening_example highlights infrastructure strain that did not meaningfully drive escalation."
    ]
  };
}

export async function buildEscalationTemporalRead(existingAudits = {}) {
  const auditMap = new Map();

  for (const [hoursKey, audit] of Object.entries(existingAudits || {})) {
    const hours = Number(hoursKey);
    if (hours && audit) {
      auditMap.set(hours, audit);
    }
  }

  for (const hours of [6, 24, 72]) {
    if (!auditMap.has(hours)) {
      auditMap.set(hours, await buildEscalationPressureAudit(hours));
    }
  }

  const current6h = summarizeTemporalWindow(auditMap.get(6));
  const residue24h = summarizeTemporalWindow(auditMap.get(24));
  const continuity72h = summarizeTemporalWindow(auditMap.get(72));
  const classified = classifyTemporalRead(current6h, residue24h, continuity72h);

  return {
    current_6h: current6h,
    residue_24h: residue24h,
    continuity_72h: continuity72h,
    temporal_state: classified.temporal_state,
    temporal_note: classified.temporal_note,
    summary_temporal: classified.summary_temporal
  };
}
