import { sparkSvg, toneMap } from "../adapter.js";
import { apiFetch } from "../data.js";
import { explainFallback } from "../fixtures.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveExplainFallback(explain, key) {
  if (!explain) {
    return explainFallback;
  }

  if (explain[key]) {
    return explain[key];
  }

  return explain;
}

function renderAuditExample(example) {
  if (!example) {
    return '<div class="small muted">No example available.</div>';
  }

  return `
    <div><strong>${escapeHtml(example.observed_update || "-")}</strong></div>
    <div class="small muted">${escapeHtml(example.region || "Unknown")} | ${escapeHtml(example.category || "unknown")} | Escalation ${escapeHtml(example.escalation_signal ?? "-")}</div>
  `;
}

function renderExplainDriverCell(driver, column) {
  const key = column.key;
  const value = driver?.[key] ?? "-";

  if (key === "sample_update") {
    const translated = driver?.sample_update_translated || driver?.sample_update || "-";
    const translationNote = driver?.translation?.applied
      ? driver.translation.note || "Machine-translated to English"
      : "";
    const original = driver?.sample_update_translated
      ? driver?.sample_update_original || driver?.sample_update || ""
      : "";

    return `
      <div>${escapeHtml(translated)}</div>
      ${translationNote ? `<div class="small muted">${escapeHtml(translationNote)}</div>` : ""}
      ${original ? `<div class="small muted">Original: ${escapeHtml(original)}</div>` : ""}
    `;
  }

  return escapeHtml(value);
}

function formatTemporalState(value) {
  return String(value || "unknown").replace(/_/g, " ");
}

function formatToneState(value) {
  return String(value || "insufficient_basis").replace(/_/g, " ");
}

function renderTemporalWindowRead(entry) {
  if (!entry) {
    return "";
  }

  return `
    <div>
      <strong>${escapeHtml(entry.window || "-")}</strong>: ${escapeHtml(entry.display || "-")} | ${escapeHtml(formatTemporalState(entry.status || "unknown"))}
    </div>
  `;
}

export function renderLiveSignalsBoard(root, props) {
  const {
    title = "Live Signals Overlay",
    subtitle = "",
    vm,
    history,
    explain,
    mode = "mock",
    loading = false,
    error = null,
    workerStatusLine = "",
    onModeChange = () => {},
    onRefresh = () => {},
  } = props ?? {};

  if (!root) {
    throw new Error("renderLiveSignalsBoard requires a root node.");
  }

  const safeVm = vm ?? {
    header: {
      disclaimer: "",
      generatedAt: "",
      modeLabel: "",
      refreshLabel: "",
      windowEnd: "",
      windowLabel: "",
      windowStart: "",
    },
    statusBanner: { show: false, title: "", items: [] },
    metricCards: [],
    composition: { title: "Signal Composition", rows: [], regions: [], regionMeta: null },
    eventTape: { title: "Visible Event Tape", note: "", rows: [], empty: true },
    heldOutField: { title: "Held-Out Field", subtitle: "", count: 0, summary: "", reasons: [], items: [], empty: true },
    signalCycle: null,
    treeOfRelief: null,
    structuralRead: null,
    notes: { title: "Volatility Notes", items: [] },
    method: { title: "Method Snapshot", items: [] },
  };

  const metricCards = safeVm.metricCards ?? [];
  const compositionRows = safeVm.composition.rows ?? [];
  const regionRows = safeVm.composition.regions ?? [];
  const regionMeta = safeVm.composition.regionMeta ?? null;
  const eventRows = safeVm.eventTape.rows ?? [];
  const eventTapeNote = safeVm.eventTape.note ?? "";
  const heldOutField = safeVm.heldOutField ?? {
    title: "Held-Out Field",
    subtitle: "",
    count: 0,
    summary: "",
    reasons: [],
    items: [],
    empty: true,
  };
  const treeOfRelief = safeVm.treeOfRelief ?? null;
  const structuralRead = safeVm.structuralRead ?? null;
  const heldOutReasons = heldOutField.reasons ?? [];
  const heldOutItems = (heldOutField.items ?? []).slice(0, 4);
  const signalCycle = safeVm.signalCycle ?? null;
  const noteItems = safeVm.notes.items ?? [];
  const methodItems = safeVm.method.items ?? [];
  const isFixtureMode = mode !== "live_api" && mode !== "live";
  const generatedLabel = isFixtureMode ? "Fixture snapshot" : "Generated";
  const modeDetail = `${safeVm.header.refreshLabel} | ${safeVm.header.modeLabel}${isFixtureMode ? " | Synthetic fallback state" : ""}`;

  root.innerHTML = `
    <section class="panel grid live-signals-board">
      <div class="between live-signals-board__header">
        <div class="live-signals-board__title-block">
          <div class="live-signals-board__eyebrow">Descriptive overlay</div>
          <h2>${escapeHtml(title)}</h2>
          <div class="muted small">${escapeHtml(subtitle)}</div>
        </div>
        <div class="row">
          ${["live_api", "mock", "degraded", "empty"]
            .map(
              (item) =>
                `<button class="btn ${mode === item ? "active" : ""}" data-ls-mode="${item}">${escapeHtml(
                  item.replace("_", " ")
                )}</button>`
            )
            .join("")}
          <button class="btn" data-ls-refresh>Refresh</button>
        </div>
      </div>

      ${loading ? '<div class="status-chip">Refreshing signal window...</div>' : ""}
      ${error ? `<div class="banner degraded show"><strong>Load warning:</strong> ${escapeHtml(error)}</div>` : ""}

      <div class="banner">
        <strong>Non-predictive use only:</strong> ${escapeHtml(safeVm.header.disclaimer)}
      </div>

      <div class="panel panel-muted small muted">
        <div><strong>Window:</strong> ${escapeHtml(safeVm.header.windowStart)} to ${escapeHtml(safeVm.header.windowEnd)} (${escapeHtml(safeVm.header.windowLabel)})</div>
        <div><strong>${escapeHtml(generatedLabel)}:</strong> ${escapeHtml(safeVm.header.generatedAt)}</div>
        <div>${escapeHtml(modeDetail)}</div>
        ${workerStatusLine ? `<div><strong>Ingest worker:</strong> ${escapeHtml(workerStatusLine)}</div>` : ""}
      </div>

      <div class="banner degraded ${safeVm.statusBanner.show ? "show" : ""}">
        ${
          safeVm.statusBanner.show
            ? `<strong>${escapeHtml(safeVm.statusBanner.title)}</strong> ${escapeHtml(safeVm.statusBanner.items.join(" | "))}`
            : ""
        }
      </div>

      <div class="panel panel-muted signal-cycle" style="display:${signalCycle ? "block" : "none"}">
        <div class="panel-heading">
          <h3>${escapeHtml(signalCycle?.title || "Signal Cycle")}</h3>
          <span class="small muted">${escapeHtml(signalCycle?.authority || "audit_display_only")}</span>
        </div>
        <div class="signal-cycle__rail" data-ls-signal-cycle></div>
        <div class="small muted signal-cycle__summary">${escapeHtml(signalCycle?.summary || "")}</div>
      </div>

      <div class="metrics" data-ls-metrics></div>

      <div class="cols-3 live-signals-board__triptych">
        <div class="panel live-signals-board__method-panel">
          <div class="panel-heading">
            <h3>${escapeHtml(safeVm.composition.title)}</h3>
            <span class="small muted">By cluster share</span>
          </div>
          <div data-ls-composition></div>
        </div>
        <div class="panel">
          <div class="panel-heading">
            <h3>Trend vs baseline</h3>
            <span class="small muted">24h and 7d comparison</span>
          </div>
          <div data-ls-trends class="grid"></div>
        </div>
        <div class="panel">
          <div class="panel-heading">
            <h3>Regional concentration</h3>
            <span class="small muted">Share of visible tape</span>
          </div>
          <ul class="data-list" data-ls-regions></ul>
          <div class="small muted" data-ls-regions-note></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-heading">
          <h3>${escapeHtml(safeVm.eventTape.title)}</h3>
          <span class="small muted">${eventRows.length} tracked updates${eventTapeNote ? ` | ${escapeHtml(eventTapeNote)}` : ""}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Region</th>
              <th>Category</th>
              <th>Observed update</th>
              <th>Severity</th>
              <th>Conf</th>
              <th>Sources</th>
              <th>Confirm</th>
              <th>Correction</th>
            </tr>
          </thead>
          <tbody data-ls-events></tbody>
        </table>
        <div class="small muted" data-ls-events-empty style="display:${safeVm.eventTape.empty ? "block" : "none"}">No events in this window.</div>
      </div>

      <div class="panel">
        <div class="panel-heading">
          <h3>${escapeHtml(heldOutField.title)}</h3>
          <span class="small muted">${heldOutField.count} held out${heldOutField.subtitle ? ` | ${escapeHtml(heldOutField.subtitle)}` : ""}</span>
        </div>
        <div class="small muted">${escapeHtml(heldOutField.summary || "No held-out clusters in this window.")}</div>
        <div class="cols-2" style="margin-top:12px">
          <div>
            <div class="small muted">Top suppression reasons</div>
            <ul class="data-list" data-ls-held-out-reasons></ul>
          </div>
          <div>
            <div class="small muted">Highest-signal held-out clusters</div>
            <ul class="data-list" data-ls-held-out-items></ul>
          </div>
        </div>
      </div>

      <div class="cols-2">
        <div class="panel">
          <div class="panel-heading">
            <h3>${escapeHtml(safeVm.notes.title)}</h3>
            <span class="small muted">Context</span>
          </div>
          <ul class="data-list" data-ls-notes></ul>
          <div data-ls-tree-of-relief style="display:${treeOfRelief ? "block" : "none"}; margin-top:16px; padding-top:16px; border-top:1px solid rgba(148, 163, 184, 0.12);">
            <div class="panel-heading">
              <h3>${escapeHtml(treeOfRelief?.title || "Tree of Relief — Moment Resolve")}</h3>
              <span class="small muted">${escapeHtml(treeOfRelief?.stateLabel || "")}</span>
            </div>
            <div class="small muted">${escapeHtml(treeOfRelief?.subtitle || "")}</div>
            <ul class="data-list" data-ls-tree-lines style="margin-top:10px"></ul>
          </div>
          <div data-ls-structural-read style="display:${structuralRead ? "block" : "none"}; margin-top:16px; padding-top:16px; border-top:1px solid rgba(148, 163, 184, 0.12);">
            <div class="panel-heading">
              <h3>${escapeHtml(structuralRead?.title || "Structural Read")}</h3>
              <span class="small muted">${escapeHtml(structuralRead ? `${structuralRead.stateLabel} | ${structuralRead.basisLabel} basis` : "")}</span>
            </div>
            <div class="small muted">${escapeHtml(structuralRead?.subtitle || "")}</div>
            <ul class="data-list" data-ls-structural-lines style="margin-top:10px"></ul>
          </div>
        </div>
        <div class="panel">
          <div class="panel-heading">
            <h3>${escapeHtml(safeVm.method.title)}</h3>
            <span class="small muted">Method</span>
          </div>
          <ul class="data-list" data-ls-method></ul>
        </div>
      </div>
    </section>

    <div class="drawer" data-ls-drawer>
      <div class="drawer-card">
        <div class="between">
          <h3 data-ls-drawer-title>Metric Explain</h3>
          <button class="btn" data-ls-close>Close</button>
        </div>
        <p class="muted" data-ls-drawer-summary></p>
        <div class="panel panel-muted small" data-ls-tone-context style="display:none">
          <div class="panel-heading">
            <h3>Tone context</h3>
            <span class="small muted" data-ls-tone-state></span>
          </div>
          <div class="small muted" data-ls-tone-summary></div>
          <div class="small muted" data-ls-tone-meta style="margin-top:6px"></div>
        </div>
        <div class="panel panel-muted small" data-ls-temporal style="display:none">
          <div class="panel-heading">
            <h3>Temporal read</h3>
            <span class="small muted" data-ls-temporal-state></span>
          </div>
          <div class="small muted" data-ls-temporal-summary></div>
          <div class="small muted" data-ls-temporal-note style="display:none"></div>
          <div data-ls-temporal-windows style="margin-top:8px"></div>
        </div>
        <table class="metric-explain-table">
          <colgroup data-ls-driver-colgroup></colgroup>
          <thead>
            <tr data-ls-driver-headings></tr>
          </thead>
          <tbody data-ls-driver-rows></tbody>
        </table>
        <ul class="data-list" data-ls-caveats></ul>
        <div data-ls-drawer-audit style="display:none">
          <div class="panel-heading">
            <h3>Operator audit</h3>
            <span class="small muted" data-ls-audit-meta></span>
          </div>
          <div class="cols-2">
            <div>
              <div class="small muted">Top contributing clusters</div>
              <ul class="data-list" data-ls-audit-contributors></ul>
            </div>
            <div>
              <div class="small muted">Top explain drivers</div>
              <ul class="data-list" data-ls-audit-drivers></ul>
            </div>
          </div>
          <div class="cols-2">
            <div>
              <div class="small muted">Strain without hardening</div>
              <div data-ls-audit-strain></div>
            </div>
            <div>
              <div class="small muted">Hardening without infrastructure dominance</div>
              <div data-ls-audit-hardening></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll("[data-ls-mode]").forEach((button) => {
    button.addEventListener("click", () => onModeChange(button.dataset.lsMode));
  });
  root.querySelector("[data-ls-refresh]")?.addEventListener("click", () => onRefresh());

  const metricsRoot = root.querySelector("[data-ls-metrics]");
  metricCards.forEach((card) => {
    const button = document.createElement("button");
    button.className = "metric";
    button.disabled = card.disabled;
    button.innerHTML = `
      <div class="k">${escapeHtml(card.title)}</div>
      <div class="v ${toneMap[card.status] || "tone-warn"}">${escapeHtml(card.valueText)}</div>
      <div class="meta">${escapeHtml(card.deltaText)} | ${escapeHtml(card.status)}</div>
    `;
    button.addEventListener("click", () => openExplain(root, card, explain));
    metricsRoot.appendChild(button);
  });
  if (!metricCards.length) {
    metricsRoot.innerHTML = '<div class="small muted">No metric cards available.</div>';
  }

  const signalCycleRoot = root.querySelector("[data-ls-signal-cycle]");
  if (signalCycleRoot && signalCycle?.steps?.length) {
    signalCycle.steps.forEach((step, index) => {
      const item = document.createElement("div");
      item.className = "signal-cycle__step";
      item.innerHTML = `
        <div class="signal-cycle__index">${escapeHtml(String(index + 1).padStart(2, "0"))}</div>
        <div class="signal-cycle__label">${escapeHtml(step.label)}</div>
        <div class="signal-cycle__value">${escapeHtml(step.value)}</div>
        <div class="signal-cycle__note">${escapeHtml(step.note)}</div>
      `;
      signalCycleRoot.appendChild(item);
    });
  } else if (signalCycleRoot) {
    signalCycleRoot.innerHTML = '<div class="small muted">No signal cycle data available.</div>';
  }

  const compositionRoot = root.querySelector("[data-ls-composition]");
  compositionRows.forEach((row) => {
    const element = document.createElement(row.href ? "a" : "div");
    element.className = "bar";
    if (row.href) {
      element.href = row.href;
      element.target = "_blank";
      element.rel = "noreferrer";
    }
    element.innerHTML = `
      <div class="row between">
        <span class="small">${escapeHtml(row.label)}</span>
        <span class="small muted">${escapeHtml(row.countText)} | ${escapeHtml(row.percentText)}</span>
      </div>
      <div class="track"><div class="fill" style="width:${Math.round((row.percent || 0) * 100)}%"></div></div>
    `;
    compositionRoot.appendChild(element);
  });
  if (!compositionRows.length) {
    compositionRoot.innerHTML = '<div class="small muted">No composition data.</div>';
  }

  const normalizedHistory = history?.series ? history : { series: {} };
  const trendsRoot = root.querySelector("[data-ls-trends]");
  metricCards.forEach((card) => {
    const series = normalizedHistory.series[card.key] || {
      baseline_24h_avg: "n/a",
      baseline_7d_avg: "n/a",
      points: card.sparkline,
    };
    const color =
      toneMap[card.status] === "tone-risk"
        ? "#ff7a7a"
        : toneMap[card.status] === "tone-ok"
          ? "#6df0b2"
          : "#ffbe5c";
    const row = document.createElement("div");
    row.className = "spark-row";
    row.innerHTML = `
      <div class="small muted">${escapeHtml(card.title)}</div>
      <div class="sparkline">${sparkSvg(series.points, color)}</div>
      <div class="small muted">24h: ${escapeHtml(series.baseline_24h_avg)} | 7d: ${escapeHtml(series.baseline_7d_avg)}</div>
    `;
    trendsRoot.appendChild(row);
  });
  if (!metricCards.length) {
    trendsRoot.innerHTML = '<div class="small muted">No trend data available.</div>';
  }

  const eventsRoot = root.querySelector("[data-ls-events]");
  eventRows.forEach((row) => {
    const tableRow = document.createElement("tr");
    tableRow.innerHTML = `
      <td>${escapeHtml(row.timeUtc)}</td>
      <td>${escapeHtml(row.region)}</td>
      <td><span class="pill">${escapeHtml(row.category)}</span></td>
      <td>
        <div>${escapeHtml(row.summary)}</div>
        ${row.visibilityNote ? `<div class="small muted">${escapeHtml(row.visibilityNote)}</div>` : ""}
        ${row.translationNote ? `<div class="small muted">${escapeHtml(row.translationNote)}</div>` : ""}
        ${row.originalSummary ? `<div class="small muted">Original: ${escapeHtml(row.originalSummary)}</div>` : ""}
      </td>
      <td><span class="pill sev-${escapeHtml(row.severity)}">${escapeHtml(row.severity.toUpperCase())}</span></td>
      <td>${escapeHtml(row.confidenceText)}</td>
      <td>${escapeHtml(row.sourceCountText)}</td>
      <td>${escapeHtml(row.confirmationState)}</td>
      <td>${escapeHtml(row.correctionState)}</td>
    `;
    if (row.href) {
      tableRow.className = "table-row-link";
      tableRow.addEventListener("click", () => {
        window.open(row.href, "_blank", "noreferrer");
      });
    }
    eventsRoot.appendChild(tableRow);
  });

  const regionsRoot = root.querySelector("[data-ls-regions]");
  const regionNoteRoot = root.querySelector("[data-ls-regions-note]");
  const normalizedRegions = regionRows.length
    ? regionRows.map((row) => ({
        label: row.label,
        shareText: row.share,
      }))
    : (() => {
        const regionCounts = {};
        eventRows.forEach((row) => {
          regionCounts[row.region] = (regionCounts[row.region] || 0) + 1;
        });
        const total = eventRows.length || 1;
        return Object.entries(regionCounts)
          .sort((left, right) => right[1] - left[1])
          .map(([region, count]) => ({
            label: region,
            shareText: `${Math.round((count / total) * 100)}%`,
          }));
      })();

  normalizedRegions.forEach((row) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `
        <span>${escapeHtml(row.label)}</span>
        <strong>${escapeHtml(row.shareText)}</strong>
      `;
      regionsRoot.appendChild(listItem);
    });
  if (!normalizedRegions.length) {
    regionsRoot.innerHTML = "<li><span>No events</span><strong>0%</strong></li>";
  }
  regionNoteRoot.textContent = regionMeta?.sample_note || "";

  const heldOutReasonsRoot = root.querySelector("[data-ls-held-out-reasons]");
  heldOutReasons.forEach((reason) => {
    const listItem = document.createElement("li");
    listItem.innerHTML = `
      <span>${escapeHtml(reason.label)}</span>
      <strong>${escapeHtml(String(reason.count))}</strong>
    `;
    heldOutReasonsRoot.appendChild(listItem);
  });
  if (!heldOutReasons.length) {
    heldOutReasonsRoot.innerHTML = "<li>No held-out reason data in this window.</li>";
  }

  const heldOutItemsRoot = root.querySelector("[data-ls-held-out-items]");
  heldOutItems.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.innerHTML = `
      <strong>${escapeHtml(item.summary)}</strong>
      ${item.translationNote ? `<div class="small muted">${escapeHtml(item.translationNote)}</div>` : ""}
      ${item.originalSummary ? `<div class="small muted">Original: ${escapeHtml(item.originalSummary)}</div>` : ""}
      <div class="small muted">${escapeHtml(item.region)} | ${escapeHtml(item.category)} | ${escapeHtml(item.supportText)}</div>
      <div class="small muted">Held out for ${escapeHtml(item.primaryReason)} | Conf ${escapeHtml(item.confidenceText)} | ${escapeHtml(item.severity)}</div>
    `;
    heldOutItemsRoot.appendChild(listItem);
  });
  if (!heldOutItems.length) {
    heldOutItemsRoot.innerHTML = "<li>No held-out clusters in this window.</li>";
  }

  const notesRoot = root.querySelector("[data-ls-notes]");
  noteItems.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    notesRoot.appendChild(listItem);
  });

  const treeLinesRoot = root.querySelector("[data-ls-tree-lines]");
  if (treeLinesRoot && treeOfRelief?.lines?.length) {
    treeOfRelief.lines.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `<strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.text)}`;
      treeLinesRoot.appendChild(listItem);
    });
  }

  const structuralLinesRoot = root.querySelector("[data-ls-structural-lines]");
  if (structuralLinesRoot && structuralRead?.lines?.length) {
    structuralRead.lines.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `<strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.text)}`;
      structuralLinesRoot.appendChild(listItem);
    });
  }

  const methodRoot = root.querySelector("[data-ls-method]");
  methodItems.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    methodRoot.appendChild(listItem);
  });

  root.querySelector("[data-ls-close]")?.addEventListener("click", () => {
    root.querySelector("[data-ls-drawer]")?.classList.remove("open");
  });

  root.querySelector("[data-ls-drawer]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      event.currentTarget.classList.remove("open");
    }
  });
}

async function openExplain(root, card, explain) {
  const fallback = resolveExplainFallback(explain, card.key);
  const explainData = card.explainPath
    ? await apiFetch(card.explainPath, fallback)
    : fallback;

  root.querySelector("[data-ls-drawer-title]").textContent = `${explainData.label || card.title} explain`;
  root.querySelector("[data-ls-drawer-summary]").textContent = explainData.definition || "";

  const driverColumns = explainData.driver_columns || [
    { key: "cluster_id", label: "Cluster" },
    { key: "headline", label: "Headline" },
    { key: "contribution", label: "Contribution" },
  ];
  const driverColgroupRoot = root.querySelector("[data-ls-driver-colgroup]");
  driverColgroupRoot.innerHTML = driverColumns
    .map((column) => `<col${column.width ? ` style="width:${escapeHtml(column.width)}"` : ""}>`)
    .join("");
  const driverHeadingsRoot = root.querySelector("[data-ls-driver-headings]");
  driverHeadingsRoot.innerHTML = driverColumns
    .map((column) => `<th>${escapeHtml(column.label || column.key || "-")}</th>`)
    .join("");

  const rowsRoot = root.querySelector("[data-ls-driver-rows]");
  rowsRoot.innerHTML = "";
  (explainData.drivers || []).forEach((driver) => {
    const tableRow = document.createElement("tr");
    tableRow.innerHTML = driverColumns
      .map((column) => `<td>${renderExplainDriverCell(driver, column)}</td>`)
      .join("");
    rowsRoot.appendChild(tableRow);
  });
  if (!(explainData.drivers || []).length) {
    rowsRoot.innerHTML = `<tr><td colspan="${driverColumns.length}">No metric drivers returned.</td></tr>`;
  }

  const caveatsRoot = root.querySelector("[data-ls-caveats]");
  caveatsRoot.innerHTML = "";
  (explainData.caveats || []).forEach((caveat) => {
    const listItem = document.createElement("li");
    listItem.textContent = caveat;
    caveatsRoot.appendChild(listItem);
  });

  const toneContextRoot = root.querySelector("[data-ls-tone-context]");
  const toneContext = explainData.tone_context || null;
  if (toneContext) {
    toneContextRoot.style.display = "block";
    root.querySelector("[data-ls-tone-state]").textContent = formatToneState(
      toneContext.tone_state
    );
    root.querySelector("[data-ls-tone-summary]").textContent = toneContext.summary_note || "";
    root.querySelector("[data-ls-tone-meta]").textContent =
      `Top tone: ${toneContext.top_tone_display || "-"} | Confidence ${Math.round((toneContext.top_tone_confidence || 0) * 100)}% | Entropy ${Number(toneContext.tone_entropy_norm || 0).toFixed(2)}`;
  } else {
    toneContextRoot.style.display = "none";
    root.querySelector("[data-ls-tone-state]").textContent = "";
    root.querySelector("[data-ls-tone-summary]").textContent = "";
    root.querySelector("[data-ls-tone-meta]").textContent = "";
  }

  const temporalRoot = root.querySelector("[data-ls-temporal]");
  const temporalRead = explainData.temporal_read || null;
  if (temporalRead) {
    const temporalSummary = explainData.summary_temporal || temporalRead.summary_temporal || temporalRead.temporal_note || "";
    const temporalNote =
      temporalRead.temporal_note && temporalRead.temporal_note !== temporalSummary
        ? temporalRead.temporal_note
        : "";

    temporalRoot.style.display = "block";
    root.querySelector("[data-ls-temporal-state]").textContent = formatTemporalState(
      temporalRead.temporal_state
    );
    root.querySelector("[data-ls-temporal-summary]").textContent = temporalSummary;
    root.querySelector("[data-ls-temporal-note]").textContent = temporalNote;
    root.querySelector("[data-ls-temporal-note]").style.display = temporalNote ? "block" : "none";
    root.querySelector("[data-ls-temporal-windows]").innerHTML = [
      renderTemporalWindowRead(temporalRead.current_6h),
      renderTemporalWindowRead(temporalRead.residue_24h),
      renderTemporalWindowRead(temporalRead.continuity_72h),
    ].join("");
  } else {
    temporalRoot.style.display = "none";
    root.querySelector("[data-ls-temporal-state]").textContent = "";
    root.querySelector("[data-ls-temporal-summary]").textContent = "";
    root.querySelector("[data-ls-temporal-note]").textContent = "";
    root.querySelector("[data-ls-temporal-note]").style.display = "none";
    root.querySelector("[data-ls-temporal-windows]").innerHTML = "";
  }

  const auditRoot = root.querySelector("[data-ls-drawer-audit]");
  const audit = explainData.operator_audit || null;
  if (audit) {
    auditRoot.style.display = "block";
    root.querySelector("[data-ls-audit-meta]").textContent =
      `${audit.current_display || "-"} | ${audit.current_status || "unknown"} | visible ${audit.visible_escalation_contributor_count ?? 0} | suppressed ${audit.suppressed_escalation_contributor_count ?? 0}`;

    const contributorsRoot = root.querySelector("[data-ls-audit-contributors]");
    contributorsRoot.innerHTML = "";
    (audit.top_contributing_clusters || []).forEach((cluster) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `<strong>${escapeHtml(cluster.observed_update || "-")}</strong><div class="small muted">${escapeHtml(cluster.region || "Unknown")} | ${escapeHtml(cluster.category || "unknown")} | Escalation ${escapeHtml(cluster.escalation_signal ?? "-")}</div>`;
      contributorsRoot.appendChild(listItem);
    });
    if (!(audit.top_contributing_clusters || []).length) {
      contributorsRoot.innerHTML = "<li>No contributing clusters returned.</li>";
    }

    const auditDriversRoot = root.querySelector("[data-ls-audit-drivers]");
    auditDriversRoot.innerHTML = "";
    (audit.top_explain_drivers || []).forEach((driver) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `<strong>${escapeHtml(driver.headline || "-")}</strong><div class="small muted">Contribution ${escapeHtml(driver.contribution ?? "-")}</div>`;
      auditDriversRoot.appendChild(listItem);
    });
    if (!(audit.top_explain_drivers || []).length) {
      auditDriversRoot.innerHTML = "<li>No explain drivers returned.</li>";
    }

    root.querySelector("[data-ls-audit-strain]").innerHTML = renderAuditExample(
      audit.strain_without_hardening_example
    );
    root.querySelector("[data-ls-audit-hardening]").innerHTML = renderAuditExample(
      audit.hardening_without_infrastructure_dominance_example
    );
  } else {
    auditRoot.style.display = "none";
  }

  root.querySelector("[data-ls-drawer]")?.classList.add("open");
}
