import { mapDashboardResponseToViewModel } from "../live-signals/adapter.js";
import { renderLiveSignalsBoard } from "../live-signals/components/LiveSignalsBoard.js";
import { loadDashboardResponse } from "../live-signals/data.js";
import {
  getDashboardFixture,
  getExplainFixture,
  getHistoryFixture,
} from "../live-signals/fixtures.js";
import { renderMT07InstrumentShell } from "../../src_mt07_MT07InstrumentShell.js";

const HOST_STYLE_ID = "hybrid-dashboard-host-style";
const SIGNAL_REFRESH_MS = 300000;

const hostStyles = `
  :root {
    --bg: #071117;
    --bg-alt: #0d1f28;
    --panel: rgba(12, 25, 33, 0.86);
    --panel-strong: rgba(8, 18, 25, 0.94);
    --line: rgba(100, 168, 191, 0.24);
    --line-strong: rgba(100, 168, 191, 0.48);
    --text: #e9f5fb;
    --muted: #9cb8c6;
    --accent: #5fe0ff;
    --accent-2: #ffbf57;
    --ok: #6df0b2;
    --warn: #ffbe5c;
    --risk: #ff7a7a;
    --shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    min-height: 100%;
    background:
      radial-gradient(circle at top left, rgba(95, 224, 255, 0.18), transparent 38%),
      radial-gradient(circle at top right, rgba(255, 191, 87, 0.14), transparent 28%),
      linear-gradient(180deg, #061017 0%, #071117 34%, #091822 100%);
    color: var(--text);
    font-family: "Bahnschrift", "Segoe UI", "Trebuchet MS", sans-serif;
  }

  body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 64px 64px;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.7), transparent);
  }

  button,
  input,
  table {
    font: inherit;
  }

  a {
    color: inherit;
  }

  ul {
    margin: 0;
    padding-left: 18px;
  }

  strong {
    font-weight: 700;
  }

  .hybrid-dashboard {
    width: 100%;
  }

  .wrap {
    max-width: 1360px;
    margin: 0 auto;
    padding: 28px 20px 40px;
  }

  .hero {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 28px;
    padding: 28px;
    margin-bottom: 18px;
    background:
      linear-gradient(140deg, rgba(95, 224, 255, 0.12), rgba(255, 191, 87, 0.05)),
      linear-gradient(180deg, rgba(8, 20, 28, 0.92), rgba(8, 16, 22, 0.96));
    box-shadow: var(--shadow);
  }

  .hero::after {
    content: "";
    position: absolute;
    width: 260px;
    height: 260px;
    right: -60px;
    top: -80px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(95, 224, 255, 0.16), transparent 72%);
  }

  .hero__grid {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
    gap: 18px;
    align-items: end;
  }

  .hero__eyebrow {
    margin-bottom: 10px;
    color: var(--accent);
    font-size: 0.78rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  .hero h1 {
    margin: 0;
    max-width: 820px;
    font-size: clamp(2rem, 3.4vw, 3.7rem);
    line-height: 0.98;
    letter-spacing: -0.04em;
  }

  .hero p {
    margin: 12px 0 0;
    max-width: 720px;
    color: var(--muted);
    line-height: 1.55;
  }

  .hero__stats {
    display: grid;
    gap: 12px;
  }

  .hero__stat {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(12px);
  }

  .hero__stat-label {
    color: var(--muted);
    font-size: 0.75rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .hero__stat strong {
    display: block;
    margin-top: 6px;
    font-size: 1.05rem;
  }

  .hero__stat-meta {
    margin-top: 6px;
    font-size: 0.82rem;
    color: var(--muted);
    white-space: pre-line;
    line-height: 1.45;
  }

  .workspace-grid {
    display: grid;
    gap: 16px;
  }

  .module-transition {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 12px;
    align-items: center;
    margin: 2px 4px;
  }

  .module-transition__line {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--line-strong), transparent);
  }

  .module-transition__label {
    color: var(--accent-2);
    font-size: 0.78rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .panel {
    border: 1px solid var(--line);
    border-radius: 22px;
    background: var(--panel);
    box-shadow: var(--shadow);
    backdrop-filter: blur(12px);
    padding: 16px;
  }

  .panel-muted {
    background: rgba(255, 255, 255, 0.03);
  }

  .grid {
    display: grid;
    gap: 14px;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .between {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
  }

  .panel-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .panel-heading h3,
  h1,
  h2,
  h3 {
    margin: 0;
  }

  .small {
    font-size: 0.82rem;
  }

  .muted {
    color: var(--muted);
  }

  .btn {
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    color: var(--text);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 160ms ease, transform 160ms ease, background 160ms ease;
  }

  .btn:hover {
    transform: translateY(-1px);
    border-color: var(--line-strong);
  }

  .btn.active {
    border-color: rgba(95, 224, 255, 0.8);
    background: rgba(95, 224, 255, 0.12);
    color: var(--accent);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 4px 9px;
    font-size: 0.74rem;
    letter-spacing: 0.04em;
    background: rgba(255, 255, 255, 0.03);
  }

  .ok,
  .tone-ok {
    color: var(--ok);
  }

  .warn,
  .tone-warn {
    color: var(--warn);
  }

  .risk,
  .tone-risk {
    color: var(--risk);
  }

  input {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 10px 12px;
    background: rgba(3, 11, 16, 0.8);
    color: var(--text);
  }

  .cols-2,
  .cols-3,
  .metrics {
    display: grid;
    gap: 12px;
  }

  .cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .metrics {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .metric {
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 14px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)),
      rgba(0, 0, 0, 0.14);
    text-align: left;
    color: inherit;
    cursor: pointer;
  }

  .metric:disabled {
    cursor: default;
    opacity: 0.7;
  }

  .metric .k,
  .meta {
    color: var(--muted);
  }

  .metric .k {
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .metric .v {
    margin: 10px 0 8px;
    font-size: 1.48rem;
    font-family: "Consolas", "SFMono-Regular", monospace;
    font-weight: 700;
  }

  .bar {
    display: grid;
    gap: 8px;
    margin: 0 0 12px;
    color: inherit;
    text-decoration: none;
  }

  .track {
    height: 10px;
    border-radius: 999px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.05);
  }

  .fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
  }

  .spark-row {
    display: grid;
    grid-template-columns: 180px 1fr 160px;
    gap: 10px;
    align-items: center;
  }

  .sparkline,
  .chart {
    border: 1px solid var(--line);
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.18);
  }

  .sparkline {
    height: 30px;
    overflow: hidden;
  }

  .chart {
    width: 100%;
    height: 280px;
    padding: 10px;
  }

  .radar-chart.is-rotating {
    animation: radar-spin 18s linear infinite;
    transform-origin: center;
  }

  @keyframes radar-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }

  th,
  td {
    padding: 10px 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    text-align: left;
    vertical-align: top;
  }

  th {
    color: var(--muted);
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .table-row-link {
    cursor: pointer;
  }

  .table-row-link:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .pill {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 4px 8px;
    font-size: 0.74rem;
    line-height: 1;
  }

  .sev-high {
    color: var(--risk);
  }

  .sev-medium {
    color: var(--warn);
  }

  .sev-low {
    color: var(--ok);
  }

  .data-list {
    list-style: none;
    padding: 0;
  }

  .data-list li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .trace-grid {
    display: grid;
    gap: 10px;
  }

  .trace-item {
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.03);
  }

  .banner {
    border-left: 4px solid var(--accent);
    border-radius: 14px;
    padding: 12px 14px;
    background: rgba(95, 224, 255, 0.08);
    color: #dff7ff;
  }

  .banner.degraded {
    display: none;
    border-left-color: var(--warn);
    background: rgba(255, 190, 92, 0.08);
    color: #ffe3b5;
  }

  .banner.degraded.show {
    display: block;
  }

  .status-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    border: 1px solid rgba(95, 224, 255, 0.3);
    border-radius: 999px;
    padding: 8px 12px;
    background: rgba(95, 224, 255, 0.09);
    color: var(--accent);
    font-size: 0.8rem;
  }

  .drawer {
    position: fixed;
    inset: 0;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(0, 0, 0, 0.62);
  }

  .drawer.open {
    display: flex;
  }

  .drawer-card {
    width: min(760px, 100%);
    max-height: calc(100vh - 40px);
    border: 1px solid var(--line-strong);
    border-radius: 24px;
    padding: 18px;
    background: var(--panel-strong);
    box-shadow: var(--shadow);
    overflow: auto;
  }

  .drawer-card td {
    word-break: break-word;
  }

  .metric-explain-table {
    table-layout: fixed;
  }

  .live-signals-board__eyebrow {
    color: var(--accent);
    font-size: 0.74rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  @media (max-width: 1120px) {
    .metrics {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .cols-3,
    .hero__grid {
      grid-template-columns: 1fr;
    }

    .spark-row {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 820px) {
    .wrap {
      padding: 18px 14px 28px;
    }

    .hero {
      padding: 20px;
      border-radius: 22px;
    }

    .metrics,
    .cols-2 {
      grid-template-columns: 1fr;
    }

    th:nth-child(8),
    th:nth-child(9),
    td:nth-child(8),
    td:nth-child(9) {
      display: none;
    }
  }
`;

function ensureHostStyles() {
  if (document.getElementById(HOST_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = HOST_STYLE_ID;
  style.textContent = hostStyles;
  document.head.appendChild(style);
}

function clamp(value, min = -3, max = 3) {
  return Math.max(min, Math.min(max, value));
}

function canonical(axis) {
  return {
    chaos: clamp(axis.chaos),
    order: clamp(axis.order),
    narrative: clamp(axis.narrative),
    time: clamp(axis.time),
  };
}

function randomAxis() {
  return canonical({
    chaos: Math.random() * 6 - 3,
    order: Math.random() * 6 - 3,
    narrative: Math.random() * 6 - 3,
    time: Math.random() * 6 - 3,
  });
}

function maxMagnitude(axis) {
  return Math.max(
    Math.abs(axis.chaos),
    Math.abs(axis.order),
    Math.abs(axis.narrative),
    Math.abs(axis.time)
  );
}

function checksumAxis(axis) {
  return Math.abs(
    Math.floor(
      (axis.chaos + 3) * 1000 +
      (axis.order + 3) * 100 +
      (axis.narrative + 3) * 10 +
      (axis.time + 3)
    )
  ).toString(36);
}

function formatUtcLabel(iso, prefix = "Updated") {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const stamp = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")} ${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")} UTC`;
  return prefix ? `${prefix} ${stamp}` : stamp;
}

function formatFixtureMode(mode = "mock") {
  return String(mode).replace(/_/g, " ");
}

function formatWorkerLane(value) {
  if (!value) {
    return "none";
  }

  return formatFixtureMode(value)
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function describeWorkerStatus(liveSignals) {
  const selectedMode = liveSignals?.mode || "mock";
  const isLiveSelected = selectedMode === "live_api" || selectedMode === "live";
  if (!isLiveSelected) {
    return {
      detailLines: [],
      summaryLine: "",
    };
  }

  const worker = liveSignals?.transport?.worker || {};
  const selectedBaskets = Array.isArray(worker.selectedBaskets) ? worker.selectedBaskets : [];
  const selectedLabel = selectedBaskets.length
    ? selectedBaskets.map(formatWorkerLane).join(", ")
    : "none";
  const nextLabel = formatWorkerLane(worker.nextBasket);
  const workerLine = worker.running
    ? `Worker: refreshing ${selectedLabel} | Next: ${nextLabel}`
    : `Worker: ${selectedLabel} | Next: ${nextLabel}`;
  const cooldownLine = worker.cooldownUntil
    ? `Cooldown: ${formatUtcLabel(worker.cooldownUntil, "")}`
    : "Cooldown: none";

  if (worker.error && !selectedBaskets.length && !worker.nextBasket && !worker.cooldownUntil) {
    return {
      detailLines: ["Worker: status unavailable"],
      summaryLine: "Worker: status unavailable",
    };
  }

  return {
    detailLines: [workerLine, cooldownLine],
    summaryLine: `${workerLine} | ${cooldownLine}`,
  };
}

function describeDataPlane(liveSignals) {
  const selectedMode = liveSignals?.mode || "mock";
  const response = liveSignals?.response || {};
  const transport = liveSignals?.transport || { source: "unknown", error: null };
  const selectedSnapshotMode =
    response?.meta?.snapshot_selection?.selected_mode || transport.selectedSnapshotMode || null;
  const selectedGeneratedAt =
    response?.meta?.snapshot_selection?.selected_generated_at ||
    transport.selectedGeneratedAt ||
    response?.meta?.generated_at;
  const loading = Boolean(liveSignals?.loading);
  const freshness = selectedGeneratedAt ? formatUtcLabel(selectedGeneratedAt) : "";
  const isLiveSelected = selectedMode === "live_api" || selectedMode === "live";
  const isFallbackSnapshot =
    transport.source === "fixture_fallback" || selectedSnapshotMode === "live_api_fallback";
  const workerStatus = describeWorkerStatus(liveSignals);

  if (!isLiveSelected) {
    const fixtureFreshness = selectedGeneratedAt
      ? formatUtcLabel(selectedGeneratedAt, "Fixture snapshot")
      : "";
    return {
      label: `Fixture mode | ${formatFixtureMode(selectedMode)}`,
      detail: [fixtureFreshness, "Synthetic fallback state for operator continuity."]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (loading && transport.source === "live_api" && freshness) {
    return {
      label: "Live local API | refreshing snapshot",
      detail: [freshness, ...workerStatus.detailLines].filter(Boolean).join("\n"),
    };
  }

  if (loading || transport.source === "awaiting_snapshot") {
    return {
      label: "Live local API | awaiting snapshot",
      detail: [freshness, ...workerStatus.detailLines].filter(Boolean).join("\n"),
    };
  }

  if (selectedSnapshotMode === "live_api") {
    return {
      label: "Live local API | snapshot active",
      detail: [freshness, ...workerStatus.detailLines].filter(Boolean).join("\n"),
    };
  }

  if (isFallbackSnapshot) {
    return {
      label: transport.error
        ? "Fixture fallback active | API request failed"
        : "Fixture fallback active | live snapshot unavailable",
      detail: [freshness, ...workerStatus.detailLines].filter(Boolean).join("\n"),
    };
  }

  if (transport.source === "live_api" && freshness) {
    return {
      label: "Live local API | snapshot active",
      detail: [freshness, ...workerStatus.detailLines].filter(Boolean).join("\n"),
    };
  }

  return {
    label: "Data plane status unknown",
    detail: [freshness, ...workerStatus.detailLines].filter(Boolean).join("\n"),
  };
}

export function mountHybridDashboardHost(root) {
  if (!root) {
    throw new Error("mountHybridDashboardHost requires a root element.");
  }

  ensureHostStyles();
  root.className = "hybrid-dashboard";

  const state = {
    baseUrl: "/api",
    demoMode: true,
    rotating: true,
    intervalMs: 1200,
    useSSE: true,
    showSummits: true,
    history: [],
    liveSignals: {
      mode: "live_api",
      loading: false,
      error: null,
      response: getDashboardFixture("mock"),
      history: getHistoryFixture("mock"),
      explain: getExplainFixture("mock"),
      transport: {
        source: "awaiting_snapshot",
        error: null,
      },
    },
  };

  let mt07Timer = null;

  root.innerHTML = `
    <div class="wrap">
      <section class="hero">
        <div class="hero__grid">
          <div>
            <div class="hero__eyebrow">Hybrid monitoring shell</div>
            <h1>Live Signals App</h1>
            <p>
              A merged operator surface that keeps the MT07 instrument shell active while layering a descriptive,
              non-predictive Live Signals board for event flow, feed health, and correction-aware monitoring.
            </p>
          </div>
          <div class="hero__stats">
            <div class="hero__stat">
              <div class="hero__stat-label">Primary feed</div>
              <strong>MT07 shell + Live Signals overlay</strong>
            </div>
            <div class="hero__stat">
              <div class="hero__stat-label">Signal window</div>
              <strong>Rolling 6 hour situational view</strong>
            </div>
            <div class="hero__stat">
              <div class="hero__stat-label">Data plane</div>
              <strong id="heroDataPlaneLabel">Live local API | awaiting snapshot</strong>
              <div class="hero__stat-meta" id="heroDataPlaneMeta"></div>
            </div>
          </div>
        </div>
      </section>

      <main class="workspace-grid">
        <div id="mt07ShellHost"></div>
        <div class="module-transition" aria-hidden="true">
          <div class="module-transition__line"></div>
          <div class="module-transition__label">Live Signals overlay</div>
          <div class="module-transition__line"></div>
        </div>
        <div id="liveSignalsHost"></div>
      </main>
    </div>
  `;

  function deriveMt07View() {
    const last = state.history[state.history.length - 1] || {
      axis: { chaos: 0, order: 0, narrative: 0, time: 0 },
      summit: false,
      brittleness: false,
      checksum: "n/a",
      trace: [],
      ts: new Date().toISOString(),
    };

    return {
      last,
      lineData: state.history.map((item, index) => ({
        i: index,
        max: maxMagnitude(item.axis),
        summit: item.summit,
      })),
    };
  }

  function renderMt07() {
    const mount = root.querySelector("#mt07ShellHost");
    const view = deriveMt07View();

    renderMT07InstrumentShell(mount, {
      title: "Weaver's Loom - MT07 v0.3.3",
      subtitle: "Primary instrument shell with Live Signals modules mounted underneath.",
      baseUrl: state.baseUrl,
      demoMode: state.demoMode,
      rotating: state.rotating,
      intervalMs: state.intervalMs,
      useSSE: state.useSSE,
      showSummits: state.showSummits,
      last: view.last,
      lineData: view.lineData,
      onBaseUrlChange: (value) => {
        state.baseUrl = value.trim() || "/api";
        renderMt07();
        refreshSignals();
      },
      onToggleDemoMode: () => {
        state.demoMode = !state.demoMode;
        if (state.demoMode && state.history.length === 0) {
          pushMt07Sample();
        }
        scheduleMt07();
        renderMt07();
      },
      onToggleRotating: () => {
        state.rotating = !state.rotating;
        renderMt07();
      },
      onIntervalMsChange: (ms) => {
        state.intervalMs = Math.max(400, ms || 1200);
        scheduleMt07();
        renderMt07();
      },
      onToggleUseSSE: () => {
        state.useSSE = !state.useSSE;
        renderMt07();
      },
      onToggleShowSummits: () => {
        state.showSummits = !state.showSummits;
        renderMt07();
      },
    });
  }

  function renderLiveSignals() {
    const liveSignalsRoot = root.querySelector("#liveSignalsHost");
    const response = state.liveSignals.response ?? getDashboardFixture("mock");
    const vm = mapDashboardResponseToViewModel(response);
    const dataPlane = describeDataPlane(state.liveSignals);
    const workerStatus = describeWorkerStatus(state.liveSignals);

    root.querySelector("#heroDataPlaneLabel").textContent = dataPlane.label;
    root.querySelector("#heroDataPlaneMeta").textContent = dataPlane.detail || "";

    renderLiveSignalsBoard(liveSignalsRoot, {
      title: "Live Signals Overlay",
      subtitle: "Descriptive monitoring layer for event intensity, source mix, and correction-aware signal flow.",
      vm,
      history: state.liveSignals.history,
      explain: state.liveSignals.explain,
      mode: state.liveSignals.mode,
      loading: state.liveSignals.loading,
      error: state.liveSignals.error,
      workerStatusLine: workerStatus.summaryLine,
      onModeChange(nextMode) {
        state.liveSignals.mode = nextMode;
        refreshSignals();
      },
      onRefresh() {
        refreshSignals();
      },
    });
  }

  function pushMt07Sample() {
    const axis = randomAxis();
    const summit = Math.random() < 0.28;
    state.history = state.history.slice(-239).concat({
      ts: new Date().toISOString(),
      axis,
      summit,
      brittleness: maxMagnitude(axis) >= 2.45,
      checksum: checksumAxis(axis),
      trace: [
        {
          hub: "X",
          flipped_axis: summit ? "chaos" : "order",
          class_shift: summit ? "changed" : "unchanged",
          interpretive_note: summit
            ? "Summit pass detected during synthetic mirror trace."
            : "Steady scan cycle completed without class shift.",
        },
      ],
    });

    renderMt07();
  }

  function scheduleMt07() {
    if (mt07Timer) {
      clearTimeout(mt07Timer);
      mt07Timer = null;
    }

    if (!state.demoMode) {
      return;
    }

    mt07Timer = setTimeout(() => {
      pushMt07Sample();
      scheduleMt07();
    }, state.intervalMs);
  }

  async function refreshSignals() {
    state.liveSignals.loading = true;
    renderLiveSignals();

    try {
      const { dashboard, history, explain, transport } = await loadDashboardResponse({
        fixtureMode: state.liveSignals.mode,
        baseUrl: state.baseUrl,
      });
      state.liveSignals.response = dashboard;
      state.liveSignals.history = history;
      state.liveSignals.explain = explain;
      state.liveSignals.transport = transport;
      state.liveSignals.error = transport?.source === "fixture_fallback" && transport?.error
        ? transport.error
        : null;
    } catch (error) {
      state.liveSignals.error = String(error);
      state.liveSignals.transport = {
        source: "fixture_fallback",
        error: String(error),
      };
    } finally {
      state.liveSignals.loading = false;
      renderLiveSignals();
    }
  }

  pushMt07Sample();
  renderMt07();
  renderLiveSignals();
  scheduleMt07();
  refreshSignals();

  setInterval(() => {
    if (state.liveSignals.mode === "live_api") {
      refreshSignals();
    }
  }, SIGNAL_REFRESH_MS);
}
