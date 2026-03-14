import { metricCardOrder } from './types.js';

export const mockDashboardResponse = {
  meta: {
    api_version: '1.0.0',
    generated_at: '2026-03-13T06:55:12Z',
    window: { label: '6h', start: '2026-03-13T00:55:12Z', end: '2026-03-13T06:55:12Z' },
    refresh_seconds: 300,
    mode: 'situational_awareness',
    predictive: false,
    timezone: 'UTC'
  },
  banner: {
    title: 'Live Signals Overlay',
    subtitle: 'Descriptive monitoring layer for event intensity, source mix, and correction-aware signal flow.',
    disclaimer: 'Non-predictive use only. This dashboard summarizes observed signals in the active window. It does not forecast outcomes or assign future probabilities.'
  },
  metrics: {
    cards: [
      { key: 'signal_velocity', label: 'Signal Velocity', value: 78, display: '78 / 100', unit: 'score', delta_vs_prior_window: 6, delta_direction: 'up', status: 'elevated', sparkline: [62, 64, 67, 72, 71, 78], explain_path: '/api/explain/metric/signal_velocity?window=6h' },
      { key: 'volatility_index', label: 'Volatility Index', value: 0.64, display: '0.64', unit: 'ratio', delta_vs_prior_window: 0.08, delta_direction: 'up', status: 'elevated', sparkline: [0.42, 0.45, 0.48, 0.59, 0.61, 0.64], explain_path: '/api/explain/metric/volatility_index?window=6h' },
      { key: 'source_diversity', label: 'Source Diversity', value: 12, display: '12 feeds', unit: 'count', delta_vs_prior_window: 2, delta_direction: 'up', status: 'healthy', sparkline: [9, 9, 10, 11, 11, 12], explain_path: '/api/explain/metric/source_diversity?window=6h' },
      { key: 'correction_rate', label: 'Correction Rate', value: 0.09, display: '9%', unit: 'percent', delta_vs_prior_window: -0.03, delta_direction: 'down', status: 'improving', sparkline: [0.16, 0.15, 0.13, 0.12, 0.11, 0.09], explain_path: '/api/explain/metric/correction_rate?window=6h' },
      { key: 'cross_source_coherence', label: 'Cross-Source Coherence', value: 0.57, display: '0.57', unit: 'ratio', delta_vs_prior_window: 0.05, delta_direction: 'up', status: 'mixed', sparkline: [0.41, 0.43, 0.46, 0.49, 0.53, 0.57], explain_path: '/api/explain/metric/cross_source_coherence?window=6h' },
      { key: 'uncertainty_index', label: 'Uncertainty Index', value: 0.38, display: '0.38', unit: 'ratio', delta_vs_prior_window: -0.04, delta_direction: 'down', status: 'moderate', sparkline: [0.52, 0.49, 0.47, 0.44, 0.41, 0.38], explain_path: '/api/explain/metric/uncertainty_index?window=6h' }
    ]
  },
  composition: {
    title: 'Signal Composition',
    basis: 'event_clusters',
    items: [
      { key: 'security', label: 'Security incidents', count: 34, cluster_count: 34, share: 0.34, display: '34%', event_path: '/api/events?window=6h&category=security' },
      { key: 'diplomacy', label: 'Diplomatic updates', count: 29, cluster_count: 29, share: 0.29, display: '29%', event_path: '/api/events?window=6h&category=diplomacy' },
      { key: 'infrastructure', label: 'Infrastructure disruptions', count: 18, cluster_count: 18, share: 0.18, display: '18%', event_path: '/api/events?window=6h&category=infrastructure' }
    ]
  },
  recent_events: {
    title: 'Recent Event Tape (Newest First)',
    sort: 'observed_at_desc',
    items: [
      { event_id: 'evt_001', cluster_id: 'cl_lev_2201', observed_at: '2026-02-24T05:32:00Z', region: 'Levant', category: 'security', summary: 'Multiple outlets report temporary airspace restrictions; status still being clarified.', severity: 'high', confidence: 0.62, source_count: 4, confirmation_state: 'emerging', correction_state: 'none', primary_source_labels: ['Wire A'], detail_path: '/api/events/evt_001' },
      { event_id: 'evt_002', cluster_id: 'cl_gulf_9911', observed_at: '2026-02-24T05:04:00Z', region: 'Gulf', category: 'diplomacy', summary: 'Foreign ministry statement confirms technical-level talks are scheduled this week.', severity: 'medium', confidence: 0.81, source_count: 3, confirmation_state: 'confirmed_multi_source', correction_state: 'none', primary_source_labels: ['Ministry Feed'], detail_path: '/api/events/evt_002' }
    ]
  },
  notes: { title: 'Volatility Notes', items: ['Volatility remains elevated due to dense update clustering.', 'Coherence improved after corrections reduced divergence.', 'No directional forecast is provided.'] },
  method_snapshot: { title: 'Method Snapshot', items: ['Time window: rolling 6 hours.', 'Count clusters, not headlines.', 'Confidence is evidence quality, not future certainty.'] },
  system_status: { ingestion: 'healthy', notes: [] }
};

export const degradedDashboardResponse = {
  ...mockDashboardResponse,
  metrics: {
    cards: mockDashboardResponse.metrics.cards.map((card) => card.key === 'cross_source_coherence'
      ? { ...card, value: null, display: 'Unavailable', delta_vs_prior_window: null, delta_direction: 'flat', status: 'degraded', sparkline: [] }
      : card)
  },
  system_status: { ingestion: 'degraded', notes: ['2 of 12 feeds delayed beyond SLA'] }
};

export const emptyDashboardResponse = {
  ...mockDashboardResponse,
  metrics: { cards: [] },
  composition: { title: 'Signal Composition', basis: 'event_clusters', items: [] },
  recent_events: { title: 'Recent Event Tape (Newest First)', sort: 'observed_at_desc', items: [] },
  notes: { title: 'Volatility Notes', items: ['No qualifying signal clusters were observed in the active window.'] }
};

export const historyFallback = {
  series: {
    signal_velocity: { baseline_24h_avg: 66, baseline_7d_avg: 61, points: [62, 64, 67, 72, 71, 78] },
    volatility_index: { baseline_24h_avg: 0.47, baseline_7d_avg: 0.41, points: [0.42, 0.45, 0.48, 0.59, 0.61, 0.64] },
    source_diversity: { baseline_24h_avg: 11, baseline_7d_avg: 10, points: [9, 9, 10, 11, 11, 12] },
    correction_rate: { baseline_24h_avg: 0.12, baseline_7d_avg: 0.15, points: [0.16, 0.15, 0.13, 0.12, 0.11, 0.09] },
    cross_source_coherence: { baseline_24h_avg: 0.49, baseline_7d_avg: 0.45, points: [0.41, 0.43, 0.46, 0.49, 0.53, 0.57] },
    uncertainty_index: { baseline_24h_avg: 0.44, baseline_7d_avg: 0.49, points: [0.52, 0.49, 0.47, 0.44, 0.41, 0.38] }
  }
};

export const explainFallback = {
  label: 'Metric',
  definition: 'Explanation unavailable.',
  drivers: [],
  caveats: ['No explain payload in this environment.']
};

export function getDashboardFixture(mode) {
  if (mode === 'degraded') return degradedDashboardResponse;
  if (mode === 'empty') return emptyDashboardResponse;
  return mockDashboardResponse;
}

export { metricCardOrder };
