/**
 * MT07InstrumentShell (presentational renderer for static-host context)
 * Host owns orchestration: streaming/demo state, history, derived series, and export.
 */

function badge(label, tone = 'slate') {
  const cls = tone === 'green' || tone === 'emerald' ? 'ok' : tone === 'yellow' ? 'warn' : tone === 'red' ? 'risk' : '';
  return `<span class="badge ${cls}">${label}</span>`;
}

function drawRadarSVG(axis, rotating) {
  const c = { x: 160, y: 140 };
  const R = 95;
  const pts = [['chaos', 0], ['order', Math.PI / 2], ['narrative', Math.PI], ['time', -Math.PI / 2]];
  let poly = '';
  pts.forEach(([k, a]) => {
    const v = ((axis?.[k] ?? 0) + 3) / 6;
    poly += `${c.x + Math.cos(a) * R * v},${c.y + Math.sin(a) * R * v} `;
  });
  return `<svg class="chart" viewBox="0 0 320 280" style="transform:${rotating ? `rotate(${Date.now() / 120}deg)` : 'none'}"><circle cx="${c.x}" cy="${c.y}" r="${R}" fill="none" stroke="#334155"/>${pts.map(([k, a]) => `<line x1="${c.x}" y1="${c.y}" x2="${c.x + Math.cos(a) * R}" y2="${c.y + Math.sin(a) * R}" stroke="#243442"/><text x="${c.x + Math.cos(a) * (R + 16)}" y="${c.y + Math.sin(a) * (R + 16)}" fill="#8da4b6" font-size="10" text-anchor="middle">${k}</text>`).join('')}<polygon points="${poly}" fill="rgba(167,139,250,.3)" stroke="#a78bfa" stroke-width="2"/></svg>`;
}

function drawTimelineSVG(lineData, showSummits) {
  const W = 560, H = 280, p = 20;
  if (!lineData?.length) return `<svg class="chart" viewBox="0 0 560 280"></svg>`;
  const n = lineData.length - 1 || 1;
  const toX = (i) => p + (i / n) * (W - p * 2);
  const toY = (v) => H - p - (v / 3) * (H - p * 2);
  const line = lineData.map((d, i) => `${i ? 'L' : 'M'} ${toX(i)} ${toY(d.max)}`).join(' ');
  const bands = showSummits
    ? lineData.map((d, i) => d.summit ? `<rect x="${toX(i) - 2}" y="${p}" width="4" height="${H - p * 2}" fill="rgba(99,102,241,.2)"/>` : '').join('')
    : '';
  return `<svg class="chart" viewBox="0 0 560 280">${bands}<path d="${line}" fill="none" stroke="#34d399" stroke-width="2"/></svg>`;
}

export function renderMT07InstrumentShell(mountEl, props) {
  const {
    title = "Weaver's Loom — MT-07 v0.3.3-TPF",
    subtitle = 'Primary instrument shell for axis radar, tension timeline, and mirror trace.',
    baseUrl,
    demoMode,
    rotating,
    intervalMs,
    useSSE,
    showSummits,
    last,
    lineData,
    onBaseUrlChange,
    onToggleDemoMode,
    onToggleRotating,
    onIntervalMsChange,
    onToggleUseSSE,
    onToggleShowSummits
  } = props;

  mountEl.innerHTML = `
    <section class="panel grid">
      <div class="between">
        <div><h1>${title}</h1><div class="muted small">${subtitle}</div></div>
        <div class="row">
          <button class="btn" data-act="spin">${rotating ? 'Pause Spin' : 'Spin Radar'}</button>
          <button class="btn" data-act="demo">${demoMode ? 'Live' : 'Demo'}</button>
          <button class="btn" data-act="stream">${useSSE ? 'SSE' : 'WebSocket'}</button>
          <button class="btn" data-act="summit">${showSummits ? 'Hide Summits' : 'Show Summits'}</button>
        </div>
      </div>

      <div class="cols-3">
        <div class="panel"><div class="small muted">Base URL</div><input data-field="baseUrl" value="${baseUrl}" /></div>
        <div class="panel"><div class="small muted">Sampling Interval (demo ms)</div><input data-field="interval" type="number" min="400" step="100" value="${intervalMs}" /></div>
        <div class="panel"><div class="small muted">MT-07 Status</div><div class="row">${[
          badge(demoMode ? 'Demo' : (useSSE ? 'Live • SSE' : 'Live • WS'), demoMode ? 'yellow' : 'green'),
          badge(last?.summit ? 'Summit' : 'Scanning', last?.summit ? 'yellow' : 'green'),
          badge(last?.brittleness ? 'Brittle' : 'Elastic', last?.brittleness ? 'red' : 'emerald'),
          badge(`Relief • ${last?.checksum || 'n/a'}`, 'slate')
        ].join(' ')}</div></div>
      </div>

      <div class="cols-2">
        <div class="panel"><div class="between"><h3>Axis Radar</h3><span class="small muted">clamped ±3</span></div>${drawRadarSVG(last?.axis || { chaos: 0, order: 0, narrative: 0, time: 0 }, rotating)}</div>
        <div class="panel"><div class="between"><h3>Tension Timeline</h3><span class="small muted">max |axis| + summit bands</span></div>${drawTimelineSVG(lineData || [], showSummits)}</div>
      </div>

      <div class="panel"><div class="between"><h3>Mirror Trace (last cycle)</h3><span class="small muted">flip → drift → clamp</span></div>
        <div class="grid">${(last?.trace?.length ? last.trace.map((t) => `<div class="trace-item"><div class="row">${badge('Hub ' + t.hub, 'indigo')} ${badge('flip: ' + t.flipped_axis, 'slate')} ${badge('class: ' + t.class_shift, t.class_shift === 'changed' ? 'emerald' : 'slate')}</div><div class="small muted">${t.interpretive_note}</div></div>`).join('') : '<div class="small muted">No mirror trace yet.</div>')}</div>
      </div>
    </section>
  `;

  mountEl.querySelector('[data-act="spin"]').addEventListener('click', onToggleRotating);
  mountEl.querySelector('[data-act="demo"]').addEventListener('click', onToggleDemoMode);
  mountEl.querySelector('[data-act="stream"]').addEventListener('click', onToggleUseSSE);
  mountEl.querySelector('[data-act="summit"]').addEventListener('click', onToggleShowSummits);
  mountEl.querySelector('[data-field="baseUrl"]').addEventListener('change', (e) => onBaseUrlChange?.(e.target.value));
  mountEl.querySelector('[data-field="interval"]').addEventListener('change', (e) => onIntervalMsChange?.(parseInt(e.target.value || '1200', 10)));
}
