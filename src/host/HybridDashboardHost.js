import { mapDashboardResponseToViewModel } from '../live-signals/adapter.js';
import { renderLiveSignalsBoard } from '../live-signals/components/LiveSignalsBoard.js';
import { loadDashboardResponse } from '../live-signals/data.js';
import {
  degradedDashboardResponse,
  emptyDashboardResponse,
  getDashboardFixture,
  historyFallback,
  mockDashboardResponse,
  mockMetricExplain,
} from '../live-signals/fixtures.js';
import { renderMT07InstrumentShell } from '../../src_mt07_MT07InstrumentShell.js';

const HOST_STYLE_ID = 'hybrid-dashboard-host-style';

const hostStyles = `
  :root{--bg:#0b1117;--panel:#131e29;--line:#21384a;--text:#dceaf4;--muted:#8da4b6;--accent:#4ad8ff;--ok:#5de39b;--warn:#ffbe5c;--risk:#ff7a7a;--divider-cyan-soft:rgba(34,211,238,.18);--divider-cyan-mid:rgba(34,211,238,.38);--divider-cyan-strong:rgba(34,211,238,.55);--divider-slate:rgba(148,163,184,.18)}
  *{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:radial-gradient(circle at top,#122131,#0b1117 48%);color:var(--text)}
  .wrap{max-width:1280px;margin:0 auto;padding:20px}.panel{border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:12px}.grid{display:grid;gap:12px}
  .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.between{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
  h1,h2,h3{margin:0}.muted{color:var(--muted)} .small{font-size:.82rem}
  .btn{border:1px solid var(--line);background:rgba(255,255,255,.02);color:var(--text);padding:6px 10px;border-radius:999px;font-size:.72rem;letter-spacing:.07em;text-transform:uppercase;cursor:pointer}
  .btn.active{border-color:var(--accent);color:var(--accent);background:rgba(74,216,255,.08)}
  .badge{border:1px solid var(--line);border-radius:999px;padding:2px 8px;font-size:.72rem}.ok{color:var(--ok)}.warn{color:var(--warn)}.risk{color:var(--risk)}
  input{background:#0c141d;border:1px solid var(--line);color:var(--text);padding:8px;border-radius:8px;width:100%}
  .cols-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.cols-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .chart{height:280px;border:1px solid var(--line);border-radius:10px;background:rgba(0,0,0,.15);padding:8px}.trace-item{border:1px solid var(--line);border-radius:10px;padding:8px;background:rgba(0,0,0,.15)}
  .banner{border-left:4px solid var(--accent);background:rgba(74,216,255,.08);padding:10px;color:#bfe4f3}.banner.degraded{display:none;border-left-color:var(--warn);background:rgba(255,190,92,.08);color:#ffd9a3}.banner.degraded.show{display:block}
  .metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.metric{border:1px solid var(--line);border-radius:10px;padding:10px;background:rgba(0,0,0,.15);text-align:left}.metric .k{font-size:.72rem;color:var(--muted);text-transform:uppercase}.metric .v{font-size:1.2rem;font-weight:700}.bar{margin:8px 0}.track{height:8px;background:#1b2a37;border-radius:999px;overflow:hidden}.fill{height:100%;background:linear-gradient(90deg,#2f95b8,var(--accent))}
  .tone-ok{color:var(--ok)} .tone-warn{color:var(--warn)} .tone-risk{color:var(--risk)}
  table{width:100%;border-collapse:collapse;font-size:.84rem}th,td{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--muted);font-size:.75rem;text-transform:uppercase}
  .pill{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:2px 8px;font-size:.72rem}.sev-high{color:var(--risk)}.sev-medium{color:var(--warn)}.sev-low{color:var(--ok)}
  .spark-row{display:grid;grid-template-columns:170px 1fr 140px;gap:8px;align-items:center}.sparkline{height:24px;border:1px solid var(--line);border-radius:6px}
  .drawer{position:fixed;inset:0;background:rgba(0,0,0,.65);display:none;align-items:flex-end}.drawer.open{display:flex}.drawer-card{background:#0f1821;border-top:1px solid var(--line);padding:14px;width:100%;max-height:70vh;overflow:auto}
  .module-transition{display:flex;align-items:center;gap:1rem;margin-top:.5rem;padding-top:.25rem}
  .module-transition__line{flex:1 1 auto;height:1px;background:linear-gradient(90deg,rgba(34,211,238,0),var(--divider-cyan-mid),rgba(34,211,238,0));box-shadow:0 0 18px rgba(34,211,238,.12)}
  .module-transition__label{flex:0 0 auto;padding:.375rem .875rem;border:1px solid var(--divider-cyan-soft);border-radius:9999px;background:linear-gradient(180deg,rgba(15,23,42,.88),rgba(2,6,23,.96));color:rgba(186,230,253,.9);font-size:.6875rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;white-space:nowrap}
  .live-signals-shell-offset{margin-top:1rem}
  .live-signals-board{position:relative;border-radius:1.25rem}
  .live-signals-board::before{content:"";position:absolute;left:1rem;right:1rem;top:-.625rem;height:1px;background:linear-gradient(90deg,rgba(34,211,238,0),var(--divider-cyan-strong),rgba(34,211,238,0));opacity:.65;pointer-events:none}
  .live-signals-board__header{margin-bottom:1rem}
  .live-signals-board__eyebrow{margin-bottom:.35rem;color:rgba(125,211,252,.78);font-size:.6875rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
  .live-signals-board__title-block{padding-bottom:.5rem;border-bottom:1px solid var(--divider-slate)}
  @media (max-width:1100px){.cols-3,.cols-2{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(3,minmax(0,1fr))}.spark-row{grid-template-columns:1fr}}
  @media (max-width:760px){.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media (min-width:1024px){.module-transition{margin-top:.875rem;padding-top:.5rem}.live-signals-shell-offset{margin-top:1.5rem}.live-signals-board__header{margin-bottom:1.25rem}}
`;

function ensureStyles() {
  if (document.getElementById(HOST_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = HOST_STYLE_ID;
  style.textContent = hostStyles;
  document.head.appendChild(style);
}

export function mountHybridDashboardHost(root) {
  if (!root) throw new Error('mountHybridDashboardHost requires a root element.');

  ensureStyles();
  root.innerHTML = `
    <main class="wrap grid">
      <div id="mt07ShellHost"></div>
      <div class="module-transition" aria-hidden="true">
        <div class="module-transition__line"></div>
        <div class="module-transition__label">Descriptive monitoring layer</div>
        <div class="module-transition__line"></div>
      </div>
      <div id="liveSignalsHost" class="live-signals-shell-offset"></div>
    </main>
  `;

  const clamp = (v, min = -3, max = 3) => Math.max(min, Math.min(max, v));
  const canonical = (a) => ({ chaos: clamp(a.chaos), order: clamp(a.order), narrative: clamp(a.narrative), time: clamp(a.time) });
  const randomAxis = () => canonical({ chaos: Math.random() * 6 - 3, order: Math.random() * 6 - 3, narrative: Math.random() * 6 - 3, time: Math.random() * 6 - 3 });
  const maxMag = (a) => Math.max(Math.abs(a.chaos), Math.abs(a.order), Math.abs(a.narrative), Math.abs(a.time));
  const checksumAxis = (ax) => Math.abs(Math.floor((ax.chaos + 3) * 1000 + (ax.order + 3) * 100 + (ax.narrative + 3) * 10 + (ax.time + 3))).toString(36);

  let state = {
    baseUrl: 'http://localhost:8787',
    demoMode: true,
    rotating: true,
    intervalMs: 1200,
    useSSE: true,
    showSummits: true,
    history: [],
    liveSignals: {
      mode: 'live_api',
      loading: false,
      error: null,
      response: mockDashboardResponse,
      history: historyFallback,
      explain: mockMetricExplain,
    },
  };

  function deriveMt07View() {
    const last = state.history[state.history.length - 1] || {
      axis: { chaos: 0, order: 0, narrative: 0, time: 0 },
      summit: false,
      brittleness: false,
      checksum: 'n/a',
      trace: [],
    };
    const lineData = state.history.map((h, i) => ({ i, max: maxMag(h.axis), summit: h.summit }));
    const summitBands = lineData.filter((d) => d.summit).map((d) => ({ x1: d.i - 0.4, x2: d.i + 0.4 }));
    return { last, lineData, summitBands };
  }

  function renderMt07() {
    const mount = root.querySelector('#mt07ShellHost');
    const view = deriveMt07View();
    renderMT07InstrumentShell(mount, {
      title: "Weaver's Loom — MT-07 v0.3.3-TPF",
      subtitle: 'Primary instrument shell + extracted Live Signals modules beneath.',
      baseUrl: state.baseUrl,
      demoMode: state.demoMode,
      rotating: state.rotating,
      intervalMs: state.intervalMs,
      useSSE: state.useSSE,
      showSummits: state.showSummits,
      last: view.last,
      lineData: view.lineData,
      summitBands: view.summitBands,
      onBaseUrlChange: (value) => { state.baseUrl = value; },
      onToggleDemoMode: () => { state.demoMode = !state.demoMode; if (state.demoMode) pushMt7Sample(); renderMt07(); },
      onToggleRotating: () => { state.rotating = !state.rotating; renderMt07(); },
      onIntervalMsChange: (ms) => { state.intervalMs = Math.max(400, ms || 1200); },
      onToggleUseSSE: () => { state.useSSE = !state.useSSE; renderMt07(); },
      onToggleShowSummits: () => { state.showSummits = !state.showSummits; renderMt07(); },
    });
  }

  function renderLiveSignals() {
    const liveSignalsRoot = root.querySelector('#liveSignalsHost');
    const response = state.liveSignals.response ?? mockDashboardResponse;
    const vm = mapDashboardResponseToViewModel(response);

    renderLiveSignalsBoard(liveSignalsRoot, {
      title: 'Live Signals Overlay',
      subtitle: 'Descriptive monitoring layer for event intensity, source mix, and correction-aware signal flow.',
      vm,
      history: state.liveSignals.history,
      explain: state.liveSignals.explain,
      mode: state.liveSignals.mode,
      loading: state.liveSignals.loading,
      error: state.liveSignals.error,
      onModeChange(nextMode) {
        state.liveSignals.mode = nextMode;
        refreshSignals();
      },
      onRefresh() {
        refreshSignals();
      },
    });
  }

  function pushMt7Sample() {
    const axis = randomAxis();
    const summit = Math.random() < 0.35;
    state.history = (state.history.length > 240 ? state.history.slice(-240) : state.history).concat({
      ts: new Date().toISOString(),
      axis,
      summit,
      brittleness: maxMag(axis) >= 2.5,
      checksum: checksumAxis(axis),
      trace: [{ hub: 'X', flipped_axis: 'order', class_shift: summit ? 'changed' : 'unchanged', interpretive_note: 'Synthetic mirror pass trace' }],
    });
    renderMt07();
    if (state.demoMode) setTimeout(pushMt7Sample, state.intervalMs);
  }

  async function refreshSignals() {
    state.liveSignals.loading = true;
    renderLiveSignals();

    try {
      const { dashboard, history, explain } = await loadDashboardResponse({ fixtureMode: state.liveSignals.mode });
      state.liveSignals.response = dashboard;
      state.liveSignals.history = history;
      state.liveSignals.explain = explain;
      state.liveSignals.error = null;
    } catch (err) {
      state.liveSignals.error = String(err);
    } finally {
      state.liveSignals.loading = false;
      renderLiveSignals();
    }
  }

  pushMt7Sample();
  renderLiveSignals();
  refreshSignals();
  setInterval(() => {
    if (state.liveSignals.mode === 'live_api') refreshSignals();
  }, 300000);

  window.__fixtures__ = {
    mockDashboardResponse,
    degradedDashboardResponse,
    emptyDashboardResponse,
    getDashboardFixture,
    historyFallback,
  };
}
