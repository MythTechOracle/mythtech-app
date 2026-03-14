import { metricCardOrder } from './types.js';

export const toneMap = { low:'tone-ok', moderate:'tone-warn', mixed:'tone-warn', healthy:'tone-ok', elevated:'tone-risk', improving:'tone-ok', degraded:'tone-risk' };

export function fallbackMetricLabel(key) {
  return key.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function getMetricCard(cards, key) {
  const found = cards.find((card) => card.key === key);
  if (found) return found;
  return {
    key,
    label: fallbackMetricLabel(key),
    value: null,
    display: 'Unavailable',
    unit: key === 'source_diversity' ? 'count' : 'ratio',
    delta_vs_prior_window: null,
    delta_direction: 'flat',
    status: 'degraded',
    sparkline: []
  };
}

export function formatRefreshLabel(sec) { return `Refresh cadence: ${Math.round(sec / 60)} min`; }
export function formatModeLabel(mode) { return `Mode: ${String(mode).replace(/_/g, ' ')}`; }

export function formatDeltaText(delta, unit) {
  if (delta == null) return 'No comparison';
  const sign = delta > 0 ? '+' : delta < 0 ? '' : '±';
  if (unit === 'percent') return `${sign}${Math.round(delta * 100)}% vs prior window`;
  if (unit === 'ratio') return `${sign}${delta.toFixed(2)} vs prior window`;
  return `${sign}${delta} vs prior window`;
}

export function formatUtcStamp(iso) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function toTitleCase(value) {
  return String(value).split(/[_\s-]+/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

export function mapSystemStatusToBanner(systemStatus) {
  if (!systemStatus || systemStatus.ingestion === 'healthy') return { show: false, tone: 'healthy', title: '', items: [] };
  if (systemStatus.ingestion === 'degraded') return { show: true, tone: 'warning', title: 'Feed degradation detected', items: systemStatus.notes || [] };
  return { show: true, tone: 'critical', title: 'Feed ingestion unavailable', items: systemStatus.notes || [] };
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
      generatedAt: response.meta.generated_at
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
        explainPath: card.explain_path
      };
    }),
    composition: {
      title: response.composition.title,
      rows: (response.composition.items || []).map((item) => ({
        key: item.key,
        label: item.label,
        percent: item.share,
        percentText: item.display,
        countText: String(item.cluster_count ?? item.count ?? 0),
        href: item.event_path
      }))
    },
    eventTape: {
      title: response.recent_events.title,
      rows: (response.recent_events.items || []).map((item) => ({
        key: item.event_id,
        timeUtc: formatUtcStamp(item.observed_at),
        region: item.region,
        category: toTitleCase(item.category),
        summary: item.summary,
        severity: item.severity,
        confidenceText: `${Math.round(item.confidence * 100)}%`,
        sourceCountText: `${item.source_count} sources`,
        confirmationState: item.confirmation_state,
        correctionState: item.correction_state,
        href: item.detail_path
      })),
      empty: (response.recent_events.items || []).length === 0
    },
    notes: response.notes,
    method: response.method_snapshot,
    statusBanner: mapSystemStatusToBanner(response.system_status)
  };
}

export function sparkSvg(points, color) {
  if (!points?.length) return '<svg viewBox="0 0 100 20"></svg>';
  const min = Math.min(...points);
  const max = Math.max(...points);
  const d = points.map((v, i) => `${i ? 'L' : 'M'} ${(i / (points.length - 1)) * 100},${max === min ? 10 : 20 - ((v - min) / (max - min)) * 20}`).join(' ');
  return `<svg viewBox="0 0 100 20" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${color}" stroke-width="2"/></svg>`;
}
