import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import * as htmlToImage from "html-to-image";

// ---------- Types (aligned to MT-07 v0.3.4-TPF) ----------
interface AxisNet {
  chaos: number;
  order: number;
  narrative: number;
  time: number;
}
interface ReliefTreeSignature {
  place: "axis_warp";
  pace: "time_weft";
  checksum: string;
}

interface MirrorTrace {
  hub: "X" | "XX";
  before: AxisNet;
  flipped_axis: keyof AxisNet;
  after_flip: AxisNet;
  drift_comp: AxisNet; // applied drift compensation (demo)
  after_comp: AxisNet; // after applying drift compensation
  normalized?: AxisNet; // optional normalization step
  clamped: AxisNet; // post-clamp (±3)
  class_shift: "changed" | "unchanged";
  interpretive_note: string;
}

interface ResultEnvelope {
  ts: string;
  processor_id: "MT-07";
  event: "result";
  result: {
    statement: string;
    packet_receipt: { ok: boolean; artifact_hash: string };
    mirror_pass?: { ran: boolean; hubs?: ("X" | "XX")[]; trace?: MirrorTrace[] };
    axis_net: AxisNet;
    next_handoff: "MT-08";
    brittleness_flag: string[];
    return_phase: "reflective_descent";
    self_audit_id: string;
    loop_id?: string;
    relief_tree_signature: ReliefTreeSignature;
  };
}

// ---------- Helpers ----------
const clamp = (v: number, min = -3, max = 3) => Math.max(min, Math.min(max, v));
const canonical = (ax: AxisNet): AxisNet => ({
  chaos: clamp(ax.chaos),
  order: clamp(ax.order),
  narrative: clamp(ax.narrative),
  time: clamp(ax.time),
});

function axisToSeries(axis: AxisNet) {
  return [
    { axis: "chaos", value: axis.chaos },
    { axis: "order", value: axis.order },
    { axis: "narrative", value: axis.narrative },
    { axis: "time", value: axis.time },
  ];
}

function maxMag(a: AxisNet) {
  return Math.max(Math.abs(a.chaos), Math.abs(a.order), Math.abs(a.narrative), Math.abs(a.time));
}

function sumAbs(a: AxisNet) {
  return Math.abs(a.chaos) + Math.abs(a.order) + Math.abs(a.narrative) + Math.abs(a.time);
}

// ---------- Demo helpers ----------
function randomAxis(): AxisNet {
  const r = () => Math.random() * 6 - 3;
  return canonical({ chaos: r(), order: r(), narrative: r(), time: r() });
}

// ---------- Lightweight checksum (same shape as worker) ----------
function checksumAxis(ax: AxisNet): string {
  const tup = [ax.chaos, ax.order, ax.narrative, ax.time].map((v) => Math.round(v * 10) / 10);
  let hash = 0;
  for (const n of tup) {
    const s = Math.floor((n + 3) * 1000);
    hash = ((hash << 5) - hash + s) | 0;
  }
  return Math.abs(hash).toString(36);
}

// ---------- Small UI Badge ----------
function Badge({ label, tone }: { label: string; tone: "emerald" | "red" | "indigo" | "violet" | "yellow" | "green" | "slate" }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    red: "bg-red-500/20 text-red-300 border-red-500/30",
    indigo: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    violet: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    yellow: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    green: "bg-green-500/20 text-green-300 border-green-500/30",
    slate: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  };
  return <span className={`px-2 py-0.5 text-xs rounded-lg border ${colors[tone]}`}>{label}</span>;
}

// ---------- Component ----------
export default function WeaverLoomDashboard() {
  const [baseUrl, setBaseUrl] = useState("http://localhost:8787");
  const [demoMode, setDemoMode] = useState(true);
  const [rotating, setRotating] = useState(true);
  const [intervalMs, setIntervalMs] = useState(1500);
  const [useSSE, setUseSSE] = useState(true);
  const [showSummits, setShowSummits] = useState(true);
  const [brittlenessThreshold, setBrittlenessThreshold] = useState(0.6); // ∑|drift|/12
  const [history, setHistory] = useState<
    Array<{
      ts: string;
      axis: AxisNet;
      summit: boolean;
      brittle: boolean;
      statement?: string;
      trace?: MirrorTrace[];
      checksum?: string;
    }>
  >([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<HTMLDivElement>(null);
  const lastAxisRef = useRef<AxisNet>({ chaos: 0, order: 0, narrative: 0, time: 0 });
  const timerRef = useRef<number | null>(null);

  // Demo loop (timer)
  useEffect(() => {
    if (!demoMode) return; // only for demo

    function tick() {
      const prev = lastAxisRef.current;
      const ax = randomAxis();
      const summit = Math.random() < 0.35;

      // drift + brittleness (per MTD note: brittleness = ∑|drift|/12)
      const drift: AxisNet = {
        chaos: ax.chaos - prev.chaos,
        order: ax.order - prev.order,
        narrative: ax.narrative - prev.narrative,
        time: ax.time - prev.time,
      };
      const brittlenessRatio = sumAbs(drift) / 12; // 0..1-ish
      const brittle = brittlenessRatio >= brittlenessThreshold;

      // MirrorPass demo trigger: on brittleness OR 1-in-5 pulses
      let trace: MirrorTrace[] | undefined = undefined;
      if (brittle || Math.random() < 0.2) {
        const before = ax;
        const mags: Array<[keyof AxisNet, number]> = [
          ["chaos", Math.abs(before.chaos)],
          ["order", Math.abs(before.order)],
          ["narrative", Math.abs(before.narrative)],
          ["time", Math.abs(before.time)],
        ];
        mags.sort((a, b) => b[1] - a[1]);
        const flipped_axis = mags[0][0];
        const after_flip: AxisNet = { ...before, [flipped_axis]: -before[flipped_axis] } as AxisNet;
        const drift_comp: AxisNet = {
          // simple compression toward center
          chaos: -Math.sign(after_flip.chaos) * Math.min(Math.abs(after_flip.chaos), 0.25),
          order: -Math.sign(after_flip.order) * Math.min(Math.abs(after_flip.order), 0.25),
          narrative: -Math.sign(after_flip.narrative) * Math.min(Math.abs(after_flip.narrative), 0.25),
          time: -Math.sign(after_flip.time) * Math.min(Math.abs(after_flip.time), 0.25),
        };
        const after_comp: AxisNet = canonical({
          chaos: after_flip.chaos + drift_comp.chaos,
          order: after_flip.order + drift_comp.order,
          narrative: after_flip.narrative + drift_comp.narrative,
          time: after_flip.time + drift_comp.time,
        });
        const clamped = canonical(after_comp);
        const class_shift: "changed" | "unchanged" = before[flipped_axis] === clamped[flipped_axis] ? "unchanged" : "changed";
        trace = [
          {
            hub: Math.random() < 0.5 ? "X" : "XX",
            before,
            flipped_axis,
            after_flip,
            drift_comp,
            after_comp,
            normalized: undefined,
            clamped,
            class_shift,
            interpretive_note: class_shift === "changed" ? "flip → clamp produced class shift" : "flip neutralized at clamp",
          },
        ];
      }

      const item = {
        ts: new Date().toISOString(),
        axis: ax,
        summit,
        brittle,
        statement: summit ? "Summit reached — structural equilibrium." : undefined,
        trace,
        checksum: checksumAxis(ax),
      };
      lastAxisRef.current = ax;
      setHistory((h) => (h.length > 240 ? h.slice(-240) : h).concat(item));
      timerRef.current = window.setTimeout(tick, intervalMs);
    }

    timerRef.current = window.setTimeout(tick, 400);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [demoMode, intervalMs, brittlenessThreshold]);

  // Live mode — SSE / WebSocket
  useEffect(() => {
    if (demoMode) return;

    let es: EventSource | null = null;
    let ws: WebSocket | null = null;
    let closed = false;

    function push(env: ResultEnvelope) {
      const ax = canonical(env.result.axis_net);
      const summit = true; // streamed results denote integration beats
      const brittle = (env.result.brittleness_flag || []).length > 0;
      const item = {
        ts: env.ts,
        axis: ax,
        summit,
        brittle,
        statement: env.result.statement,
        trace: env.result.mirror_pass?.trace,
        checksum: env.result.relief_tree_signature.checksum,
      };
      lastAxisRef.current = ax;
      setHistory((h) => (h.length > 240 ? h.slice(-240) : h).concat(item));
    }

    if (useSSE) {
      es = new EventSource(`${baseUrl.replace(/\/$/, "")}/tau/mt-07/stream`);
      es.onmessage = (ev) => {
        try {
          push(JSON.parse((ev as MessageEvent).data));
        } catch {
          /* noop */
        }
      };
      es.onerror = () => {
        es?.close();
        if (closed) return;
        // fallback to WebSocket
        const wsUrl = baseUrl.replace(/^http/, "ws").replace(/\/$/, "") + "/tau/mt-07/stream";
        ws = new WebSocket(wsUrl);
        ws.onmessage = (ev) => {
          try {
            push(JSON.parse((ev as MessageEvent).data));
          } catch {
            /* noop */
          }
        };
      };
    } else {
      const wsUrl = baseUrl.replace(/^http/, "ws").replace(/\/$/, "") + "/tau/mt-07/stream";
      ws = new WebSocket(wsUrl);
      ws.onmessage = (ev) => {
        try {
          push(JSON.parse((ev as MessageEvent).data));
        } catch {
          /* noop */
        }
      };
    }

    return () => {
      closed = true;
      es?.close();
      ws?.close();
    };
  }, [demoMode, baseUrl, useSSE]);

  const last = history[history.length - 1];
  const radarData = useMemo(() => axisToSeries(last?.axis ?? { chaos: 0, order: 0, narrative: 0, time: 0 }), [last]);
  const lineData = useMemo(() => history.map((h, i) => ({ i, max: maxMag(h.axis), summit: h.summit, ts: h.ts })), [history]);

  // Build summit bands for ReferenceArea
  const summitBands = useMemo(() => {
    if (!showSummits) return [] as Array<{ x1: number; x2: number }>;
    const bands: Array<{ x1: number; x2: number }> = [];
    const width = 0.8; // band width in index space
    lineData.forEach((d) => {
      if (d.summit) bands.push({ x1: d.i - width / 2, x2: d.i + width / 2 });
    });
    return bands;
  }, [lineData, showSummits]);

  // CSS rotation for radar
  const rotationStyle: React.CSSProperties = rotating ? { animation: "spin 16s linear infinite" } : {};

  // Export PNG of charts panel
  async function exportPNG() {
    if (!chartsRef.current) return;
    const node = chartsRef.current;
    const dataUrl = await htmlToImage.toPng(node, { cacheBust: true, pixelRatio: 2 * (window.devicePixelRatio || 1) });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `weaver-loom-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
    a.click();
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100 p-6" ref={containerRef}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Weaver’s Loom — MT-07 v0.3.4‑TPF</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRotating((r) => !r)}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700"
            >
              {rotating ? "Pause Spin" : "Spin Radar"}
            </button>
            <button
              onClick={() => setDemoMode((d) => !d)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500"
            >
              {demoMode ? "Live" : "Demo"}
            </button>
            <button
              onClick={() => setUseSSE((u) => !u)}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700"
            >
              {useSSE ? "SSE" : "WebSocket"}
            </button>
            <button
              onClick={() => setShowSummits((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700"
            >
              {showSummits ? "Hide Summits" : "Show Summits"}
            </button>
            <button
              onClick={exportPNG}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500"
            >
              Export PNG
            </button>
          </div>
        </header>

        {/* Controls */}
        <section className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
            <p className="text-sm mb-2 opacity-80">Base URL</p>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:outline-none"
            />
            <p className="mt-3 text-xs opacity-70">Worker origin (e.g., http://localhost:8787)</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
            <p className="text-sm mb-2 opacity-80">Sampling Interval (demo)</p>
            <input
              type="number"
              min={400}
              step={100}
              value={intervalMs}
              onChange={(e) => setIntervalMs(parseInt(e.target.value || "1000"))}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:outline-none"
            />
            <p className="mt-3 text-xs opacity-70">Used only in Demo mode.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
            <p className="text-sm mb-2 opacity-80">Status</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge label={demoMode ? "Demo" : useSSE ? "Live • SSE" : "Live • WS"} tone={demoMode ? "yellow" : "green"} />
              <Badge label={last?.summit ? "Summit" : "Scanning"} tone={last?.summit ? "indigo" : "slate"} />
              <Badge label={last?.brittle ? "Brittle" : "Elastic"} tone={last?.brittle ? "red" : "emerald"} />
              {last?.checksum && <Badge label={`Relief • ${last.checksum}`} tone="violet" />}
            </div>
            <div className="mt-3 text-xs opacity-70 flex items-center gap-2">
              <label className="whitespace-nowrap">Brittleness Threshold</label>
              <input
                type="number"
                step={0.05}
                min={0}
                max={1}
                value={brittlenessThreshold}
                onChange={(e) => setBrittlenessThreshold(parseFloat(e.target.value || "0.6"))}
                className="w-24 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 focus:outline-none"
              />
              <span className="opacity-60">(∑|drift| / 12)</span>
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className="grid md:grid-cols-2 gap-6" ref={chartsRef}>
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Axis Radar (chaos/order/narrative/time)</h2>
              <span className="text-xs opacity-70">clamped ±3</span>
            </div>
            <div className="h-72 md:h-80" style={rotationStyle}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="axis" />
                  <PolarRadiusAxis angle={30} domain={[-3, 3]} tickCount={7} />
                  <Radar name="axis" dataKey="value" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Tension Timeline (|axis|max)</h2>
              <span className="text-xs opacity-70">Summit bands • Brittleness via drift</span>
            </div>
            <div className="h-72 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 10, right: 24, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="i" tick={{ fill: "#cbd5e1" }} />
                  <YAxis domain={[0, 3]} tick={{ fill: "#cbd5e1" }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" }} />
                  <Line type="monotone" dataKey="max" stroke="#34d399" dot={false} strokeWidth={2} />
                  {showSummits &&
                    summitBands.map((b, idx) => (
                      <ReferenceArea key={idx} x1={b.x1} x2={b.x2} y1={0} y2={3} fill="#6366f1" fillOpacity={0.12} strokeOpacity={0} />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs opacity-80">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-400" /> <span>tension (max|axis|)</span>
              {showSummits && (
                <>
                  <span className="inline-block w-3 h-3 rounded-sm bg-indigo-400/40 border border-indigo-400/60" /> <span>summit window</span>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Trace Panel */}
        <section className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Mirror Trace (last cycle)</h2>
            <span className="text-xs opacity-70">flip → comp → clamp</span>
          </div>
          {last?.trace?.length ? (
            <div className="grid gap-3">
              {last.trace.map((t, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-900/70 border border-slate-700">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge label={`Hub ${t.hub}`} tone="indigo" />
                      <Badge label={`flip: ${t.flipped_axis}`} tone="slate" />
                      <Badge label={`class: ${t.class_shift}`} tone={t.class_shift === "changed" ? "emerald" : "slate"} />
                    </div>
                    <span className="text-xs opacity-70">{t.interpretive_note}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs opacity-80">
                    <div>
                      <span className="opacity-60">before</span>
                      <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(t.before)}</pre>
                    </div>
                    <div>
                      <span className="opacity-60">after_flip</span>
                      <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(t.after_flip)}</pre>
                    </div>
                    <div>
                      <span className="opacity-60">after_comp</span>
                      <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(t.after_comp)}</pre>
                    </div>
                    <div>
                      <span className="opacity-60">clamped</span>
                      <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(t.clamped)}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm opacity-70">No mirror trace yet — Live will stream traces; Demo synthesizes locally.</p>
          )}
        </section>

        {/* Footer */}
        <footer className="pt-2 text-xs opacity-60">
          <p>
            Weaver’s Loom — a Myth‑Tech dashboard for the Ten‑Point Format. Space/Time ↔ Warp/Weft. Summit moments are marked by
            integration.
          </p>
        </footer>
      </div>
    </div>
  );
}
