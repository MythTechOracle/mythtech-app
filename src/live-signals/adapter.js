import { metricCardOrder } from "./types.js";

const coreCompositionRows = [
  { key: "security", label: "Security incidents" },
  { key: "diplomacy", label: "Diplomatic updates" },
  { key: "infrastructure", label: "Infrastructure disruptions" },
  { key: "cyber", label: "Cyber advisories" },
];

export const toneMap = {
  contained: "tone-ok",
  hardening: "tone-risk",
  low: "tone-ok",
  moderate: "tone-warn",
  mixed: "tone-warn",
  healthy: "tone-ok",
  elevated: "tone-risk",
  improving: "tone-ok",
  degraded: "tone-risk",
  watch: "tone-warn",
};

export function fallbackMetricLabel(key) {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getMetricCard(cards, key) {
  const found = cards.find((card) => card.key === key);
  if (found) {
    return found;
  }

  return {
    key,
    label: fallbackMetricLabel(key),
    value: null,
    display: "Unavailable",
    unit: key === "source_diversity" ? "count" : "ratio",
    delta_vs_prior_window: null,
    delta_direction: "flat",
    status: "degraded",
    sparkline: [],
  };
}

export function formatRefreshLabel(sec) {
  const minutes = Math.max(1, Math.round((sec || 60) / 60));
  return `Refresh cadence: ${minutes} min`;
}

export function formatModeLabel(mode) {
  return `Mode: ${String(mode).replace(/_/g, " ")}`;
}

export function formatDeltaText(delta, unit) {
  if (delta == null) {
    return "No comparison";
  }

  const sign = delta > 0 ? "+" : delta < 0 ? "" : "+/-";
  if (unit === "percent") {
    return `${sign}${Math.round(delta * 100)}% vs prior window`;
  }

  if (unit === "ratio") {
    return `${sign}${delta.toFixed(2)} vs prior window`;
  }

  return `${sign}${delta} vs prior window`;
}

export function formatUtcStamp(iso) {
  const date = new Date(iso);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")} ${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")} UTC`;
}

export function toTitleCase(value) {
  return String(value)
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeCompositionItems(items = []) {
  const byKey = new Map((items || []).map((item) => [item.key, item]));
  const extras = (items || []).filter((item) => !coreCompositionRows.some((row) => row.key === item.key));

  return [
    ...coreCompositionRows.map((row) => {
      const existing = byKey.get(row.key);
      if (existing) {
        return existing;
      }

      return {
        key: row.key,
        label: row.label,
        count: 0,
        cluster_count: 0,
        share: 0,
        display: "0%",
        event_path: `/api/events?window=6h&category=${row.key}`,
      };
    }),
    ...extras,
  ];
}

export function mapSystemStatusToBanner(systemStatus) {
  if (!systemStatus || systemStatus.ingestion === "healthy") {
    return { show: false, tone: "healthy", title: "", items: [] };
  }

  if (systemStatus.ingestion === "degraded") {
    return {
      show: true,
      tone: "warning",
      title: "Feed degradation detected",
      items: systemStatus.notes || [],
    };
  }

  return {
    show: true,
    tone: "critical",
    title: "Feed ingestion unavailable",
    items: systemStatus.notes || [],
  };
}

export function mapDashboardResponseToViewModel(response) {
  return {
    header: {
      title: response.banner.title,
      subtitle: response.banner.subtitle,
      disclaimer: response.banner.disclaimer,
      windowLabel: response.meta.window.label,
      windowStart: response.meta.window.start,
      windowEnd: response.meta.window.end,
      refreshLabel: formatRefreshLabel(response.meta.refresh_seconds),
      modeLabel: formatModeLabel(response.meta.mode),
      generatedAt: formatUtcStamp(response.meta.generated_at),
    },
    metricCards: metricCardOrder.map((key) => {
      const card = getMetricCard(response.metrics.cards || [], key);

      return {
        key: card.key,
        title: card.label,
        valueText: card.display,
        deltaText: formatDeltaText(card.delta_vs_prior_window, card.unit),
        deltaDirection: card.delta_direction,
        status: card.status,
        sparkline: card.sparkline || [],
        disabled: card.value == null,
        explainPath: card.explain_path,
      };
    }),
    composition: {
      title: response.composition.title,
      rows: normalizeCompositionItems(response.composition.items || []).map((item) => ({
        key: item.key,
        label: item.label,
        percent: item.share,
        percentText: item.display,
        countText: String(item.cluster_count ?? item.count ?? 0),
        href: item.event_path,
      })),
      regions: (response.composition.regional_concentration || []).map((item) => ({
        label: item.label,
        share: item.share,
      })),
      regionMeta: response.composition.regional_concentration_meta || null,
    },
    eventTape: {
      title: response.recent_events.title,
      note: response.recent_events.sort_note || "",
      rows: (response.recent_events.items || []).map((item) => ({
        key: item.event_id,
        timeUtc: formatUtcStamp(item.observed_at),
        region: item.region,
        category: toTitleCase(item.category),
        summary: item.summary_translated || item.summary,
        originalSummary: item.summary_translated ? item.summary_original || item.summary : "",
        translationNote: item.translation?.applied ? item.translation.note || "Machine-translated to English" : "",
        severity: item.severity,
        confidenceText: `${Math.round(item.confidence * 100)}%`,
        sourceCountText: `${item.source_count} sources`,
        confirmationState: toTitleCase(item.confirmation_state),
        correctionState: toTitleCase(item.correction_state),
        visibilityState: item.visibility_state || "authoritative",
        visibilityNote: item.visibility_note || "",
        href: item.detail_path,
      })),
      empty: (response.recent_events.items || []).length === 0,
    },
    heldOutField: {
      title: response.held_out_field?.title || "Held-Out Field",
      subtitle: response.held_out_field?.subtitle || "What was seen but refused",
      count: response.held_out_field?.held_out_count || 0,
      summary: response.held_out_field?.summary_note || "No held-out clusters in this window.",
      reasons: (response.held_out_field?.top_suppression_reasons || []).map((item) => ({
        key: item.reason_code,
        label: toTitleCase(item.reason_code || "unspecified"),
        count: item.count || 0,
      })),
      items: (response.held_out_field?.items || []).map((item) => ({
        key: item.cluster_id,
        summary: item.observed_update_translated || item.observed_update,
        originalSummary: item.observed_update_translated ? item.observed_update_original || item.observed_update : "",
        translationNote: item.translation?.applied ? item.translation.note || "Machine-translated to English" : "",
        region: item.region || item.country || "Unknown",
        category: toTitleCase(item.category),
        severity: toTitleCase(item.severity || "low"),
        confidenceText: `${Math.round((item.confidence || 0) * 100)}%`,
        supportText:
          (item.source_family_count || 0) >= 2
            ? `${item.source_family_count} families | ${item.source_count} sources`
            : `${item.source_count} source${item.source_count === 1 ? "" : "s"}`,
        primaryReason: toTitleCase(item.primary_suppression_reason || "unspecified"),
      })),
      empty: (response.held_out_field?.held_out_count || 0) === 0,
    },
    structuralRead: response.structural_read
      ? {
          title: response.structural_read.title || "Structural Read",
          subtitle:
            response.structural_read.subtitle || "Analytical map of the present window, not a forecast.",
          state: response.structural_read.state || "contained",
          stateLabel: toTitleCase(response.structural_read.state_label || response.structural_read.state || "contained"),
          basis: response.structural_read.basis || "weak",
          basisLabel: toTitleCase(response.structural_read.basis_label || response.structural_read.basis || "weak"),
          lines: [
            {
              key: "active_domain",
              label: "Active domain",
              text: response.structural_read.lines?.active_domain || "",
            },
            {
              key: "load_bearing_factors",
              label: "Load-bearing factors",
              text: response.structural_read.lines?.load_bearing_factors || "",
            },
            {
              key: "constraint_factors",
              label: "Constraint factors",
              text: response.structural_read.lines?.constraint_factors || "",
            },
            {
              key: "held_out_pressure",
              label: "Held-out pressure",
              text: response.structural_read.lines?.held_out_pressure || "",
            },
            {
              key: "current_structural_state",
              label: "Current structural state",
              text: response.structural_read.lines?.current_structural_state || "",
            },
            {
              key: "open_edge",
              label: "Open edge",
              text: response.structural_read.lines?.open_edge || "",
            },
          ].filter((item) => item.text),
        }
      : null,
    toneMetrics: response.tone_metrics
      ? {
          topToneDisplay: response.tone_metrics.top_tone_display || "",
          topToneConfidence: response.tone_metrics.top_tone_confidence || 0,
          toneEntropyNorm: response.tone_metrics.tone_entropy_norm ?? 1,
          toneState: response.tone_metrics.tone_state || "insufficient_basis",
          basisClusterCount: response.tone_metrics.basis_cluster_count || 0,
          basisVisibleCount: response.tone_metrics.basis_visible_count || 0,
          summaryNote: response.tone_metrics.summary_note || "",
        }
      : null,
    treeOfRelief: response.tree_of_relief
      ? {
          title: response.tree_of_relief.title || "Tree of Relief — Moment Resolve",
          subtitle:
            response.tree_of_relief.subtitle || "Narrative audit of the present window, not a forecast.",
          state: response.tree_of_relief.state || "contained",
          stateLabel: toTitleCase(response.tree_of_relief.state_label || response.tree_of_relief.state || "contained"),
          lines: [
            {
              key: "what_formed",
              label: "What formed",
              text: response.tree_of_relief.lines?.what_formed || "",
            },
            {
              key: "what_held",
              label: "What held",
              text: response.tree_of_relief.lines?.what_held || "",
            },
            {
              key: "what_resolves",
              label: "What resolves",
              text: response.tree_of_relief.lines?.what_resolves || "",
            },
            {
              key: "what_remains_open",
              label: "What remains open",
              text: response.tree_of_relief.lines?.what_remains_open || "",
            },
          ].filter((item) => item.text),
        }
      : null,
    notes: response.notes,
    method: response.method_snapshot,
    statusBanner: mapSystemStatusToBanner(response.system_status),
  };
}

export function sparkSvg(points, color) {
  if (!points?.length) {
    return '<svg viewBox="0 0 100 20"></svg>';
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const pathData = points
    .map((value, index) => {
      const x = (index / Math.max(1, points.length - 1)) * 100;
      const y = max === min ? 10 : 20 - ((value - min) / (max - min)) * 20;
      return `${index ? "L" : "M"} ${x},${y}`;
    })
    .join(" ");

  return `<svg viewBox="0 0 100 20" preserveAspectRatio="none"><path d="${pathData}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/></svg>`;
}
