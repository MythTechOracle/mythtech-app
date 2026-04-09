import {
  getDashboardFixture,
  getExplainFixture,
  getHistoryFixture,
} from "./fixtures.js";

function toErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error || "Request failed");
}

export async function apiFetchWithMeta(path, fallback) {
  try {
    const response = await fetch(path, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return {
      data: await response.json(),
      ok: true,
      fallbackUsed: false,
      error: null,
    };
  } catch (error) {
    return {
      data: fallback,
      ok: false,
      fallbackUsed: true,
      error: toErrorMessage(error),
    };
  }
}

export async function apiFetch(path, fallback) {
  const result = await apiFetchWithMeta(path, fallback);
  return result.data;
}

const modeToFixture = {
  degraded: "degraded",
  empty: "empty",
  live: "live_api",
  live_api: "live_api",
  mock: "mock",
};

function joinApiPath(baseUrl, path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!baseUrl) {
    return cleanPath;
  }

  const cleanBase = String(baseUrl).replace(/\/+$/, "");
  return `${cleanBase}${cleanPath}`;
}

function prefixApiPath(baseUrl, href) {
  if (!href || /^https?:\/\//.test(href)) {
    return href;
  }

  if (!href.startsWith("/api")) {
    return href;
  }

  const cleanBase = String(baseUrl || "").replace(/\/+$/, "");
  if (!cleanBase) {
    return href;
  }

  const apiBase = cleanBase.endsWith("/api") ? cleanBase : `${cleanBase}/api`;
  return `${apiBase}${href.slice(4)}`;
}

function clone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function rewriteDashboardLinks(dashboard, baseUrl) {
  const next = clone(dashboard);

  next.metrics.cards = (next.metrics.cards || []).map((card) => ({
    ...card,
    explain_path: prefixApiPath(baseUrl, card.explain_path),
  }));
  next.composition.items = (next.composition.items || []).map((item) => ({
    ...item,
    event_path: prefixApiPath(baseUrl, item.event_path),
  }));
  next.recent_events.items = (next.recent_events.items || []).map((item) => ({
    ...item,
    detail_path: prefixApiPath(baseUrl, item.detail_path),
  }));

  return next;
}

export async function loadDashboardResponse({ fixtureMode, baseUrl = "/api" } = {}) {
  const normalizedMode = modeToFixture[fixtureMode] || "live_api";

  if (normalizedMode !== "live_api") {
    return {
      dashboard: rewriteDashboardLinks(getDashboardFixture(normalizedMode), baseUrl),
      history: getHistoryFixture(normalizedMode),
      explain: getExplainFixture(normalizedMode),
      transport: {
        source: "fixture_mode",
        selectedMode: normalizedMode,
        error: null,
        worker: {
          enabled: false,
          running: false,
          lastStatus: "fixture_mode",
          selectedBaskets: [],
          nextBasket: null,
          basketsPerCycle: null,
          rateLimited: false,
          cooldownUntil: null,
          error: null,
        },
      },
    };
  }

  const dashboardPath = joinApiPath(baseUrl, "/dashboard?window=6h");
  const historyPath = joinApiPath(baseUrl, "/metrics/history?window=6h&compare=24h,7d");

  const dashboardResult = await apiFetchWithMeta(dashboardPath, getDashboardFixture("mock"));
  const historyResult = await apiFetchWithMeta(historyPath, getHistoryFixture("mock"));
  const eventsResult = await apiFetchWithMeta(
    joinApiPath(baseUrl, "/events?window=6h&sort=observed_at:desc&limit=50"),
    { items: dashboardResult.data.recent_events?.items || [] }
  );
  const compositionResult = await apiFetchWithMeta(
    joinApiPath(baseUrl, "/composition?window=6h"),
    { items: dashboardResult.data.composition?.items || [] }
  );
  const dashboard = dashboardResult.data;
  const history = historyResult.data;
  const events = eventsResult.data;
  const composition = compositionResult.data;
  const refreshLoop = dashboard?.meta?.refresh_loop || {};
  const workerState = refreshLoop.worker || {};
  const selectedSnapshotMode = dashboard?.meta?.snapshot_selection?.selected_mode || null;
  const isFallbackSnapshot =
    selectedSnapshotMode === "live_api_fallback" || dashboard?.meta?.mode === "live_api_fallback";

  return {
    dashboard: rewriteDashboardLinks(
      {
        ...dashboard,
        recent_events: {
          ...dashboard.recent_events,
          items: events.items || dashboard.recent_events?.items || [],
        },
        composition: {
          ...dashboard.composition,
          items: composition.items || dashboard.composition?.items || [],
        },
      },
      baseUrl
    ),
    history,
    explain: getExplainFixture("mock"),
    transport: {
      source: dashboardResult.fallbackUsed || isFallbackSnapshot ? "fixture_fallback" : "live_api",
      selectedMode: normalizedMode,
      selectedSnapshotMode,
      selectedGeneratedAt:
        dashboard?.meta?.snapshot_selection?.selected_generated_at || dashboard?.meta?.generated_at || null,
      selectionPolicy: dashboard?.meta?.snapshot_selection?.selection_policy || null,
      error: dashboardResult.error,
      worker: {
        enabled: Boolean(refreshLoop.enabled),
        running: Boolean(refreshLoop.running),
        lastStatus: refreshLoop.last_status || null,
        lastCompletedAt: refreshLoop.last_completed_at || null,
        nextRunAt: refreshLoop.next_run_at || null,
        selectedBaskets: workerState.selected_baskets || [],
        nextBasket: workerState.next_basket || null,
        basketsPerCycle: workerState.baskets_per_cycle || null,
        rateLimited: Boolean(workerState.rate_limited),
        cooldownUntil: workerState.cooldown_until || null,
        error: null,
      },
      partialFallback:
        historyResult.fallbackUsed ||
        eventsResult.fallbackUsed ||
        compositionResult.fallbackUsed,
    },
  };
}
