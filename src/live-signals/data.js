import {
  degradedMetricExplain,
  emptyMetricExplain,
  getDashboardFixture,
  historyFallback,
  mockMetricExplain,
} from './fixtures.js';

export async function apiFetch(path, fallback) {
  try {
    const response = await fetch(path, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    return fallback;
  }
}

const modeToFixture = {
  live_api: 'live_api',
  live: 'live_api',
  mock: 'mock',
  degraded: 'degraded',
  empty: 'empty',
};

function getExplainFixture(mode) {
  if (mode === 'degraded') return degradedMetricExplain;
  if (mode === 'empty') return emptyMetricExplain;
  return mockMetricExplain;
}

export async function loadDashboardResponse({ fixtureMode }) {
  const normalizedMode = modeToFixture[fixtureMode] || 'live_api';

  if (normalizedMode !== 'live_api') {
    return {
      dashboard: getDashboardFixture(normalizedMode),
      history: historyFallback,
      explain: getExplainFixture(normalizedMode),
    };
  }

  const dashboard = await apiFetch('/api/dashboard?window=6h', getDashboardFixture('mock'));
  const history = await apiFetch('/api/metrics/history?window=6h&compare=24h,7d', historyFallback);
  const events = await apiFetch('/api/events?window=6h&sort=observed_at:desc&limit=50', dashboard.recent_events);
  const composition = await apiFetch('/api/composition?window=6h', dashboard.composition);

  return {
    dashboard: {
      ...dashboard,
      recent_events: { ...dashboard.recent_events, items: events.items || dashboard.recent_events.items },
      composition: { ...dashboard.composition, items: composition.items || dashboard.composition.items },
    },
    history,
    explain: mockMetricExplain,
  };
}
