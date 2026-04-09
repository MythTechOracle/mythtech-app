function badge(label, tone = "slate") {
  const className =
    tone === "green" || tone === "emerald"
      ? "ok"
      : tone === "yellow"
        ? "warn"
        : tone === "red"
          ? "risk"
          : "";
  return `<span class="badge ${className}">${label}</span>`;
}

function drawRadarSvg(axis, rotating) {
  const center = { x: 160, y: 140 };
  const radius = 95;
  const points = [
    // Compass orientation: narrative north, order east, time south, chaos west.
    ["narrative", -Math.PI / 2],
    ["order", 0],
    ["time", Math.PI / 2],
    ["chaos", Math.PI],
  ];

  let polygon = "";
  points.forEach(([key, angle]) => {
    const value = ((axis?.[key] ?? 0) + 3) / 6;
    polygon += `${center.x + Math.cos(angle) * radius * value},${center.y + Math.sin(angle) * radius * value} `;
  });

  return `
    <svg class="chart radar-chart ${rotating ? "is-rotating" : ""}" viewBox="0 0 320 280">
      <circle cx="${center.x}" cy="${center.y}" r="${radius}" fill="none" stroke="#335469" />
      ${points
        .map(
          ([key, angle]) => `
            <line x1="${center.x}" y1="${center.y}" x2="${center.x + Math.cos(angle) * radius}" y2="${center.y + Math.sin(angle) * radius}" stroke="#274253" />
            <text x="${center.x + Math.cos(angle) * (radius + 18)}" y="${center.y + Math.sin(angle) * (radius + 18)}" fill="#9cb8c6" font-size="11" text-anchor="middle">${key}</text>
          `
        )
        .join("")}
      <polygon points="${polygon}" fill="rgba(95, 224, 255, 0.24)" stroke="#5fe0ff" stroke-width="2.5" />
    </svg>
  `;
}

function drawTimelineSvg(lineData, showSummits) {
  const width = 560;
  const height = 280;
  const padding = 20;

  if (!lineData?.length) {
    return `<svg class="chart" viewBox="0 0 ${width} ${height}"></svg>`;
  }

  const pointsCount = Math.max(1, lineData.length - 1);
  const toX = (index) => padding + (index / pointsCount) * (width - padding * 2);
  const toY = (value) => height - padding - (value / 3) * (height - padding * 2);
  const line = lineData
    .map((point, index) => `${index ? "L" : "M"} ${toX(index)} ${toY(point.max)}`)
    .join(" ");
  const summitBands = showSummits
    ? lineData
        .map((point, index) =>
          point.summit
            ? `<rect x="${toX(index) - 4}" y="${padding}" width="8" height="${height - padding * 2}" fill="rgba(255, 191, 87, 0.2)" />`
            : ""
        )
        .join("")
    : "";

  return `
    <svg class="chart" viewBox="0 0 ${width} ${height}">
      ${summitBands}
      <path d="${line}" fill="none" stroke="#6df0b2" stroke-width="2.5" stroke-linecap="round" />
    </svg>
  `;
}

function formatAxisSummary(axis) {
  return Object.entries(axis || {})
    .map(([key, value]) => `${key}:${Number(value).toFixed(2)}`)
    .join(" | ");
}

export function renderMT07InstrumentShell(mountEl, props) {
  const {
    title = "Weaver's Loom - MT07",
    subtitle = "Primary instrument shell for axis radar, tension timeline, and mirror trace.",
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
    onToggleShowSummits,
  } = props;

  mountEl.innerHTML = `
    <section class="panel grid">
      <div class="between">
        <div>
          <h2>${title}</h2>
          <div class="muted small">${subtitle}</div>
        </div>
        <div class="row">
          <button class="btn" data-act="spin">${rotating ? "Pause spin" : "Spin radar"}</button>
          <button class="btn" data-act="demo">${demoMode ? "Live mode" : "Demo mode"}</button>
          <button class="btn" data-act="stream">${useSSE ? "Transport: SSE" : "Transport: WS"}</button>
          <button class="btn" data-act="summit">${showSummits ? "Hide summits" : "Show summits"}</button>
        </div>
      </div>

      <div class="cols-3">
        <div class="panel panel-muted">
          <div class="small muted">Base URL</div>
          <input data-field="baseUrl" value="${baseUrl}" />
        </div>
        <div class="panel panel-muted">
          <div class="small muted">Sampling interval (demo ms)</div>
          <input data-field="interval" type="number" min="400" step="100" value="${intervalMs}" />
        </div>
        <div class="panel panel-muted">
          <div class="small muted">MT07 status</div>
          <div class="row">
            ${[
              badge(demoMode ? "Demo" : useSSE ? "Live SSE" : "Live WS", demoMode ? "yellow" : "green"),
              badge(last?.summit ? "Summit" : "Scanning", last?.summit ? "yellow" : "green"),
              badge(last?.brittleness ? "Brittle" : "Elastic", last?.brittleness ? "red" : "emerald"),
              badge(`Relief ${last?.checksum || "n/a"}`, "slate"),
            ].join(" ")}
          </div>
        </div>
      </div>

      <div class="cols-2">
        <div class="panel">
          <div class="panel-heading">
            <h3>Axis radar</h3>
            <span class="small muted">Clamped +/-3</span>
          </div>
          ${drawRadarSvg(last?.axis || { chaos: 0, order: 0, narrative: 0, time: 0 }, rotating)}
          <div class="small muted">Current axis: ${formatAxisSummary(last?.axis || {})}</div>
        </div>
        <div class="panel">
          <div class="panel-heading">
            <h3>Tension timeline</h3>
            <span class="small muted">Max |axis| with summit bands</span>
          </div>
          ${drawTimelineSvg(lineData || [], showSummits)}
          <div class="small muted">Last cycle: ${last?.ts || "n/a"}</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-heading">
          <h3>Mirror trace</h3>
          <span class="small muted">Flip -> drift -> clamp</span>
        </div>
        <div class="trace-grid">
          ${
            last?.trace?.length
              ? last.trace
                  .map(
                    (trace) => `
                      <div class="trace-item">
                        <div class="row">
                          ${badge(`Hub ${trace.hub}`, "indigo")}
                          ${badge(`flip ${trace.flipped_axis}`, "slate")}
                          ${badge(`class ${trace.class_shift}`, trace.class_shift === "changed" ? "emerald" : "slate")}
                        </div>
                        <div class="small muted">${trace.interpretive_note}</div>
                      </div>
                    `
                  )
                  .join("")
              : '<div class="small muted">No mirror trace available yet.</div>'
          }
        </div>
      </div>
    </section>
  `;

  mountEl.querySelector('[data-act="spin"]')?.addEventListener("click", onToggleRotating);
  mountEl.querySelector('[data-act="demo"]')?.addEventListener("click", onToggleDemoMode);
  mountEl.querySelector('[data-act="stream"]')?.addEventListener("click", onToggleUseSSE);
  mountEl.querySelector('[data-act="summit"]')?.addEventListener("click", onToggleShowSummits);
  mountEl
    .querySelector('[data-field="baseUrl"]')
    ?.addEventListener("change", (event) => onBaseUrlChange?.(event.target.value));
  mountEl
    .querySelector('[data-field="interval"]')
    ?.addEventListener("change", (event) => onIntervalMsChange?.(parseInt(event.target.value || "1200", 10)));
}
