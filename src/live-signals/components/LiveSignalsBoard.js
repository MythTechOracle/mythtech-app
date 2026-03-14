import { apiFetch } from '../data.js';
import { explainFallback } from '../fixtures.js';
import { sparkSvg, toneMap } from '../adapter.js';

export function renderLiveSignalsBoard(root, props) {
  const { vm, history, mode, loading, error, onModeChange, onRefresh } = props;

  root.innerHTML = `
    <section class="panel grid">
      <div class="between">
        <div><h2>${vm.header.title}</h2><div class="muted small">${vm.header.subtitle}</div></div>
        <div class="row">
          ${['live_api','mock','degraded','empty'].map((m)=>`<button class="btn ${mode===m?'active':''}" data-ls-mode="${m}">${m.replace('_',' ')}</button>`).join('')}
          <button class="btn" data-ls-refresh>Refresh</button>
        </div>
      </div>
      ${loading ? '<div class="small muted">Loading…</div>' : ''}
      ${error ? `<div class="banner degraded show"><strong>Load warning:</strong> ${error}</div>` : ''}
      <div class="banner"><strong>Non-predictive use only:</strong> ${vm.header.disclaimer}</div>
      <div class="panel small muted"><div><strong>Window:</strong> ${vm.header.windowStart} → ${vm.header.windowEnd} (${vm.header.windowLabel})</div><div><strong>Generated:</strong> ${vm.header.generatedAt}</div><div>${vm.header.refreshLabel} · ${vm.header.modeLabel}</div></div>
      <div class="banner degraded ${vm.statusBanner.show?'show':''}">${vm.statusBanner.show?`<strong>${vm.statusBanner.title}</strong> ${vm.statusBanner.items.join(' · ')}`:''}</div>

      <div class="metrics" data-ls-metrics></div>
      <div class="cols-3">
        <div class="panel"><h3>${vm.composition.title}</h3><div data-ls-composition></div></div>
        <div class="panel"><h3>Trend vs baseline (24h/7d)</h3><div data-ls-trends class="grid"></div></div>
        <div class="panel"><h3>Regional Concentration</h3><ul data-ls-regions></ul></div>
      </div>

      <div class="panel">
        <h3>${vm.eventTape.title}</h3>
        <table><thead><tr><th>Time</th><th>Region</th><th>Category</th><th>Observed update</th><th>Severity</th><th>Conf</th><th>Sources</th><th>Confirm</th><th>Correction</th></tr></thead><tbody data-ls-events></tbody></table>
        <div class="small muted" data-ls-events-empty style="display:${vm.eventTape.empty?'block':'none'}">No events in this window.</div>
      </div>

      <div class="cols-2">
        <div class="panel"><h3>${vm.notes.title}</h3><ul data-ls-notes></ul></div>
        <div class="panel"><h3>${vm.method.title}</h3><ul data-ls-method></ul></div>
      </div>
    </section>

    <div class="drawer" data-ls-drawer><div class="drawer-card"><div class="between"><h3 data-ls-drawer-title>Metric Explain</h3><button class="btn" data-ls-close>Close</button></div><p class="muted" data-ls-drawer-summary></p><table><thead><tr><th>Cluster</th><th>Headline</th><th>Contribution</th></tr></thead><tbody data-ls-driver-rows></tbody></table><ul data-ls-caveats></ul></div></div>
  `;

  root.querySelectorAll('[data-ls-mode]').forEach((btn)=>btn.addEventListener('click',()=>onModeChange?.(btn.dataset.lsMode)));
  root.querySelector('[data-ls-refresh]')?.addEventListener('click',()=>onRefresh?.());

  const metrics = root.querySelector('[data-ls-metrics]');
  vm.metricCards.forEach((card)=>{
    const button=document.createElement('button');
    button.className='metric';
    button.disabled=card.disabled;
    button.innerHTML=`<div class="k">${card.title}</div><div class="v ${toneMap[card.status]||'tone-warn'}">${card.valueText}</div><div class="meta">${card.deltaText} · ${card.status}</div>`;
    button.addEventListener('click',()=>openExplain(root,card));
    metrics.appendChild(button);
  });
  if(!vm.metricCards.length) metrics.innerHTML='<div class="small muted">No metric cards available.</div>';

  const comp=root.querySelector('[data-ls-composition]');
  vm.composition.rows.forEach((row)=>{
    const el=document.createElement(row.href?'a':'div');
    el.className='bar';
    if(row.href){el.href=row.href;el.style.color='inherit';el.style.textDecoration='none';}
    el.innerHTML=`<div class="row between"><span class="small">${row.label}</span><span class="small muted">${row.countText} · ${row.percentText}</span></div><div class="track"><div class="fill" style="width:${Math.round(row.percent*100)}%"></div></div>`;
    comp.appendChild(el);
  });
  if(!vm.composition.rows.length) comp.innerHTML='<div class="small muted">No composition data.</div>';

  const trends=root.querySelector('[data-ls-trends]');
  vm.metricCards.forEach((card)=>{
    const series=history.series?.[card.key]||{baseline_24h_avg:'n/a',baseline_7d_avg:'n/a',points:card.sparkline};
    const color=toneMap[card.status]==='tone-risk'?'#ff7a7a':toneMap[card.status]==='tone-ok'?'#5de39b':'#ffbe5c';
    const row=document.createElement('div'); row.className='spark-row';
    row.innerHTML=`<div class="small muted">${card.title}</div><div class="sparkline">${sparkSvg(series.points,color)}</div><div class="small muted">24h:${series.baseline_24h_avg} · 7d:${series.baseline_7d_avg}</div>`;
    trends.appendChild(row);
  });

  const events=root.querySelector('[data-ls-events]');
  vm.eventTape.rows.forEach((row)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${row.timeUtc}</td><td>${row.region}</td><td><span class="pill">${row.category}</span></td><td>${row.summary}</td><td><span class="pill sev-${row.severity}">${row.severity.toUpperCase()}</span></td><td>${row.confidenceText}</td><td>${row.sourceCountText}</td><td>${row.confirmationState}</td><td>${row.correctionState}</td>`;
    tr.style.cursor='pointer'; tr.addEventListener('click',()=>window.open(row.href,'_blank'));
    events.appendChild(tr);
  });

  const regions=root.querySelector('[data-ls-regions]');
  const counts={}; vm.eventTape.rows.forEach((r)=>{counts[r.region]=(counts[r.region]||0)+1;});
  const total=vm.eventTape.rows.length||1;
  Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{const li=document.createElement('li');li.innerHTML=`<span>${k}</span><strong>${Math.round(v/total*100)}%</strong>`;regions.appendChild(li);});
  if(!Object.keys(counts).length) regions.innerHTML='<li><span>No events</span><strong>0%</strong></li>';

  const notes=root.querySelector('[data-ls-notes]'); vm.notes.items.forEach((i)=>{const li=document.createElement('li'); li.textContent=i; notes.appendChild(li);});
  const method=root.querySelector('[data-ls-method]'); vm.method.items.forEach((i)=>{const li=document.createElement('li'); li.textContent=i; method.appendChild(li);});

  root.querySelector('[data-ls-close]')?.addEventListener('click',()=>root.querySelector('[data-ls-drawer]').classList.remove('open'));
  root.querySelector('[data-ls-drawer]')?.addEventListener('click',(e)=>{ if(e.target===root.querySelector('[data-ls-drawer]')) e.currentTarget.classList.remove('open'); });
}

async function openExplain(root, card) {
  const explain = await apiFetch(card.explainPath || '', explainFallback);
  root.querySelector('[data-ls-drawer-title]').textContent = `${explain.label || card.title} · explain`;
  root.querySelector('[data-ls-drawer-summary]').textContent = explain.definition || '';
  const rows = root.querySelector('[data-ls-driver-rows]'); rows.innerHTML='';
  (explain.drivers || []).forEach((d)=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${d.cluster_id||'—'}</td><td>${d.headline||'—'}</td><td>${d.contribution??'—'}</td>`; rows.appendChild(tr);});
  if (!(explain.drivers || []).length) rows.innerHTML='<tr><td colspan="3">No metric drivers returned.</td></tr>';
  const caveats=root.querySelector('[data-ls-caveats]'); caveats.innerHTML=''; (explain.caveats||[]).forEach((c)=>{ const li=document.createElement('li'); li.textContent=c; caveats.appendChild(li);});
  root.querySelector('[data-ls-drawer]').classList.add('open');
}
