import { explainFallback } from '../fixtures.js';
import { apiFetch } from '../data.js';
import { sparkSvg, toneMap } from '../adapter.js';

export function renderLiveSignalsBoard(vm, history) {
  document.getElementById('bannerTitle').textContent = vm.header.title;
  document.getElementById('bannerSubtitle').textContent = vm.header.subtitle;
  document.getElementById('mainDisclaimer').innerHTML = `<strong>Non-predictive use only:</strong> ${vm.header.disclaimer}`;
  document.getElementById('windowMeta').innerHTML = `<div><strong>Window:</strong> ${vm.header.windowStart} → ${vm.header.windowEnd} (${vm.header.windowLabel})</div><div><strong>Generated:</strong> ${vm.header.generatedAt}</div><div>${vm.header.refreshLabel} · ${vm.header.modeLabel}</div>`;

  const degradedBanner = document.getElementById('degradedBanner');
  degradedBanner.classList.toggle('show', vm.statusBanner.show);
  if (vm.statusBanner.show) degradedBanner.innerHTML = `<strong>${vm.statusBanner.title}</strong> ${vm.statusBanner.items.join(' · ')}`;

  const metrics = document.getElementById('metrics');
  metrics.innerHTML = '';
  vm.metricCards.forEach((card) => {
    const button = document.createElement('button');
    button.className = 'metric';
    button.disabled = card.disabled;
    button.innerHTML = `<div class="k">${card.title}</div><div class="v ${toneMap[card.status] || 'tone-warn'}">${card.valueText}</div><div class="meta">${card.deltaText} · ${card.status}</div>`;
    button.addEventListener('click', () => openExplain(card));
    metrics.appendChild(button);
  });

  if (!vm.metricCards.length) metrics.innerHTML = '<div class="small muted">No metric cards available.</div>';

  document.getElementById('compositionTitle').textContent = vm.composition.title;
  const composition = document.getElementById('composition');
  composition.innerHTML = '';
  vm.composition.rows.forEach((row) => {
    const el = document.createElement(row.href ? 'a' : 'div');
    el.className = 'bar';
    if (row.href) {
      el.href = row.href;
      el.style.color = 'inherit';
      el.style.textDecoration = 'none';
    }
    el.innerHTML = `<div class="row between"><span class="small">${row.label}</span><span class="small muted">${row.countText} · ${row.percentText}</span></div><div class="track"><div class="fill" style="width:${Math.round(row.percent * 100)}%"></div></div>`;
    composition.appendChild(el);
  });
  if (!vm.composition.rows.length) composition.innerHTML = '<div class="small muted">No composition data.</div>';

  const trendSparks = document.getElementById('trendSparks');
  trendSparks.innerHTML = '';
  vm.metricCards.forEach((card) => {
    const series = history.series?.[card.key] || { baseline_24h_avg: 'n/a', baseline_7d_avg: 'n/a', points: card.sparkline };
    const color = toneMap[card.status] === 'tone-risk' ? '#ff7a7a' : toneMap[card.status] === 'tone-ok' ? '#5de39b' : '#ffbe5c';
    const row = document.createElement('div');
    row.className = 'spark-row';
    row.innerHTML = `<div class="spark-label">${card.title}</div><div class="sparkline">${sparkSvg(series.points, color)}</div><div class="delta ${toneMap[card.status] || ''}">24h:${series.baseline_24h_avg} · 7d:${series.baseline_7d_avg}</div>`;
    trendSparks.appendChild(row);
  });

  const eventTape = document.getElementById('eventTape');
  eventTape.innerHTML = '';
  vm.eventTape.rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.timeUtc}</td><td>${row.region}</td><td><span class="pill">${row.category}</span></td><td>${row.summary}</td><td><span class="pill sev-${row.severity}">${row.severity.toUpperCase()}</span></td><td>${row.confidenceText}</td><td>${row.sourceCountText}</td><td>${row.confirmationState}</td><td>${row.correctionState}</td>`;
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => window.open(row.href, '_blank'));
    eventTape.appendChild(tr);
  });

  document.getElementById('eventsTitle').textContent = vm.eventTape.title;
  document.getElementById('eventTapeEmpty').style.display = vm.eventTape.empty ? 'block' : 'none';

  const regionCounts = {};
  vm.eventTape.rows.forEach((row) => { regionCounts[row.region] = (regionCounts[row.region] || 0) + 1; });
  const regions = document.getElementById('regions');
  regions.innerHTML = '';
  const total = vm.eventTape.rows.length || 1;
  Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${k}</span><strong>${Math.round(v / total * 100)}%</strong>`;
    regions.appendChild(li);
  });
  if (!Object.keys(regionCounts).length) regions.innerHTML = '<li><span>No events</span><strong>0%</strong></li>';

  document.getElementById('notesTitle').textContent = vm.notes.title;
  const notes = document.getElementById('notes');
  notes.innerHTML = '';
  vm.notes.items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    notes.appendChild(li);
  });

  document.getElementById('methodTitle').textContent = vm.method.title;
  const method = document.getElementById('method');
  method.innerHTML = '';
  vm.method.items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    method.appendChild(li);
  });
}

async function openExplain(card) {
  const data = await apiFetch(card.explainPath || '', explainFallback);
  document.getElementById('drawerTitle').textContent = `${data.label || card.title} · explain`;
  document.getElementById('drawerSummary').textContent = data.definition || '';

  const clusterRows = document.getElementById('clusterRows');
  clusterRows.innerHTML = '';
  (data.drivers || []).forEach((d) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${d.cluster_id || '—'}</td><td>${d.headline || '—'}</td><td>${d.contribution ?? '—'}</td>`;
    clusterRows.appendChild(tr);
  });
  if (!(data.drivers || []).length) clusterRows.innerHTML = '<tr><td colspan="3">No metric drivers returned.</td></tr>';

  const caveats = document.getElementById('caveats');
  caveats.innerHTML = '';
  (data.caveats || []).forEach((c) => {
    const li = document.createElement('li');
    li.textContent = c;
    caveats.appendChild(li);
  });

  document.getElementById('drawer').classList.add('open');
}
