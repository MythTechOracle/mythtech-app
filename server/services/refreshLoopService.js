import { runRefreshLiveData } from "../jobs/refreshLiveData.js";

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
const MIN_INTERVAL_MS = 60 * 1000;

const refreshState = {
  enabled: false,
  interval_ms: DEFAULT_INTERVAL_MS,
  run_on_start: true,
  running: false,
  started_at: null,
  last_started_at: null,
  last_completed_at: null,
  last_status: "idle",
  last_error: null,
  last_result: null,
  next_run_at: null,
};

let refreshTimer = null;
let initialized = false;

function parseBoolean(value, fallback) {
  if (value == null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function parseInterval(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(MIN_INTERVAL_MS, numeric);
}

function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

function scheduleNext(config) {
  if (!refreshState.enabled) {
    refreshState.next_run_at = null;
    return;
  }

  clearRefreshTimer();
  const nextRunAt = new Date(Date.now() + config.intervalMs).toISOString();
  refreshState.next_run_at = nextRunAt;
  refreshTimer = setTimeout(() => {
    void runManagedRefreshCycle(config, "interval");
  }, config.intervalMs);
}

async function runManagedRefreshCycle(config, reason = "manual") {
  if (refreshState.running) {
    refreshState.last_status = "skipped_overlap";
    scheduleNext(config);
    return null;
  }

  refreshState.running = true;
  refreshState.last_started_at = new Date().toISOString();
  refreshState.last_status = `running:${reason}`;
  refreshState.last_error = null;

  try {
    const result = await runRefreshLiveData();
    refreshState.last_completed_at = new Date().toISOString();
    refreshState.last_status = "ok";
    refreshState.last_result = result;
    return result;
  } catch (error) {
    refreshState.last_completed_at = new Date().toISOString();
    refreshState.last_status = "error";
    refreshState.last_error = String(error?.stack || error?.message || error);
    console.error("[live-refresh]", refreshState.last_error);
    return null;
  } finally {
    refreshState.running = false;
    scheduleNext(config);
  }
}

function buildRefreshConfig(env = process.env) {
  return {
    enabled: parseBoolean(env.LIVE_REFRESH_ENABLED, true),
    intervalMs: parseInterval(env.LIVE_REFRESH_INTERVAL_MS, DEFAULT_INTERVAL_MS),
    runOnStart: parseBoolean(env.LIVE_REFRESH_RUN_ON_START, true),
  };
}

export function getRefreshLoopStatus() {
  return {
    enabled: refreshState.enabled,
    interval_ms: refreshState.interval_ms,
    run_on_start: refreshState.run_on_start,
    running: refreshState.running,
    started_at: refreshState.started_at,
    last_started_at: refreshState.last_started_at,
    last_completed_at: refreshState.last_completed_at,
    last_status: refreshState.last_status,
    last_error: refreshState.last_error,
    last_result: refreshState.last_result,
    next_run_at: refreshState.next_run_at,
  };
}

export function startRefreshLoop(env = process.env) {
  if (initialized) {
    return getRefreshLoopStatus();
  }

  initialized = true;
  const config = buildRefreshConfig(env);

  refreshState.enabled = config.enabled;
  refreshState.interval_ms = config.intervalMs;
  refreshState.run_on_start = config.runOnStart;
  refreshState.started_at = new Date().toISOString();
  refreshState.last_status = config.enabled ? "scheduled" : "disabled";

  if (!config.enabled) {
    refreshState.next_run_at = null;
    return getRefreshLoopStatus();
  }

  if (config.runOnStart) {
    void runManagedRefreshCycle(config, "startup");
  } else {
    scheduleNext(config);
  }

  return getRefreshLoopStatus();
}
