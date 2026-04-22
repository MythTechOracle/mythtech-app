const AXES = ["chaos", "order", "narrative", "time"];
const BEAT_LABELS = ["Spark", "Aim", "Design", "Build", "Iterate", "Integrate"];
const BEATS_TOTAL = 6;
const EPSILON = 1e-12;
const CLAMP_MIN = -3;
const CLAMP_MAX = 3;
const BLEND_PREV_WEIGHT = 0.18;
const LOVELACE_THRESHOLD = 1.5;
const LOVELACE_SCALE = 0.92;

function asNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function round(value) {
  return Number(asNumber(value).toFixed(12));
}

function clamp(value) {
  return Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, asNumber(value)));
}

function scoreToAxis(value) {
  const centered = ((asNumber(value, 50) - 50) / 50) * 3;
  return round(clamp(centered));
}

function getMetricCardValue(bundle, key, fallback = 50) {
  const card = (bundle?.dashboard?.metrics?.cards || []).find((entry) => entry.key === key);
  if (card) return asNumber(card.value, fallback);
  return fallback;
}

function getSeriesPoints(bundle, key, beatsTotal, fallback = 50) {
  const historySeries = bundle?.history?.series?.[key];
  const rawPoints = Array.isArray(historySeries?.points) ? historySeries.points : null;
  const defaultValue = asNumber(historySeries?.current, getMetricCardValue(bundle, key, fallback));

  if (!rawPoints || rawPoints.length === 0) {
    return Array.from({ length: beatsTotal }, () => defaultValue);
  }

  const normalized = rawPoints.map((value) => asNumber(value, defaultValue));
  if (normalized.length === beatsTotal) {
    return normalized;
  }

  if (normalized.length > beatsTotal) {
    return normalized.slice(-beatsTotal);
  }

  const result = [...normalized];
  while (result.length < beatsTotal) {
    result.push(result[result.length - 1] ?? defaultValue);
  }
  return result;
}

function pickMirrorAxis(axes) {
  let bestAxis = AXES[0];
  let bestAbs = -Infinity;
  for (const axis of AXES) {
    const magnitude = Math.abs(asNumber(axes?.[axis]));
    if (magnitude > bestAbs) {
      bestAbs = magnitude;
      bestAxis = axis;
    }
  }
  return bestAxis;
}

function buildPairInvariants(axes) {
  const chaosOrder = round(asNumber(axes.chaos) + asNumber(axes.order));
  const narrativeTime = round(asNumber(axes.narrative) + asNumber(axes.time));
  return {
    "chaos + order": {
      value: chaosOrder,
      min: -1,
      max: 1,
      pass: chaosOrder >= -1 - EPSILON && chaosOrder <= 1 + EPSILON
    },
    "narrative + time": {
      value: narrativeTime,
      min: -2,
      max: 2,
      pass: narrativeTime >= -2 - EPSILON && narrativeTime <= 2 + EPSILON
    }
  };
}

function buildGateIn({ coherence, uncertainty, sampleState }) {
  const reasons = [];
  if (coherence < 35) reasons.push("coherence_below_floor");
  if (uncertainty > 80) reasons.push("uncertainty_above_ceiling");
  if (["empty", "extremely_thin"].includes(sampleState)) reasons.push(`sample_state_${sampleState}`);
  return {
    ok: reasons.length === 0,
    reason: reasons.length === 0 ? null : reasons.join("+")
  };
}

function applyMirrorAndClamp(axesBlend, mirrorAxis) {
  const post = {};
  const clampedAxes = [];
  for (const axis of AXES) {
    const reflected = axis === mirrorAxis ? -asNumber(axesBlend[axis]) : asNumber(axesBlend[axis]);
    const clamped = clamp(reflected);
    if (clamped !== reflected) clampedAxes.push(axis);
    post[axis] = round(clamped);
  }
  return { axesPostMirror: post, clampedAxes };
}

function applyLovelace(axesPostMirror) {
  const axesFinal = {};
  const dampedAxes = [];
  const clampedAxes = [];
  for (const axis of AXES) {
    let value = asNumber(axesPostMirror[axis]);
    if (Math.abs(value) > LOVELACE_THRESHOLD) {
      value *= LOVELACE_SCALE;
      dampedAxes.push(axis);
    }
    const clamped = clamp(value);
    if (clamped !== value) clampedAxes.push(axis);
    axesFinal[axis] = round(clamped);
  }
  return { axesFinal, dampedAxes, clampedAxes };
}

function blendAxes(axesIn, previousFinal) {
  if (!previousFinal) {
    return { ...axesIn };
  }

  const axesBlend = {};
  for (const axis of AXES) {
    const current = asNumber(axesIn[axis]);
    const prev = asNumber(previousFinal[axis], current);
    axesBlend[axis] = round(current * (1 - BLEND_PREV_WEIGHT) + prev * BLEND_PREV_WEIGHT);
  }
  return axesBlend;
}

function deriveAxesInAtBeat(index, metrics) {
  const chaosSource = metrics.volatility[index] * 0.65 + metrics.uncertainty[index] * 0.35;
  const orderSource = metrics.coherence[index] * 0.75 + (100 - metrics.correction[index]) * 0.25;
  const narrativeSource = metrics.signalVelocity[index] * 0.6 + metrics.escalation[index] * 0.4;
  const timeSource = metrics.sourceDiversity[index] * 0.7 + (100 - metrics.uncertainty[index]) * 0.3;

  return {
    chaos: scoreToAxis(chaosSource),
    order: scoreToAxis(orderSource),
    narrative: scoreToAxis(narrativeSource),
    time: scoreToAxis(timeSource)
  };
}

export function buildMt07KernelSessionPacket({ bundle, selection }) {
  const trace = bundle?.dashboard?.trace || {};
  const metrics = {
    signalVelocity: getSeriesPoints(bundle, "signal_velocity", BEATS_TOTAL, 50),
    volatility: getSeriesPoints(bundle, "volatility_index", BEATS_TOTAL, 50),
    sourceDiversity: getSeriesPoints(bundle, "source_diversity", BEATS_TOTAL, 50),
    correction: getSeriesPoints(bundle, "correction_rate", BEATS_TOTAL, 0),
    coherence: getSeriesPoints(bundle, "cross_source_coherence", BEATS_TOTAL, 50),
    uncertainty: getSeriesPoints(bundle, "uncertainty_index", BEATS_TOTAL, 50),
    escalation: getSeriesPoints(bundle, "escalation_pressure", BEATS_TOTAL, 50)
  };

  const sampleState = trace.sample_state || "unknown";
  const series = [];
  let previousFinal = null;

  for (let beat = 0; beat < BEATS_TOTAL; beat += 1) {
    const axesIn = deriveAxesInAtBeat(beat, metrics);
    const axesBlend = blendAxes(axesIn, previousFinal);
    const gateIn = buildGateIn({
      coherence: metrics.coherence[beat],
      uncertainty: metrics.uncertainty[beat],
      sampleState
    });
    const preInvariants = buildPairInvariants(axesBlend);
    const mirrorNeeded = !gateIn.ok || !preInvariants["chaos + order"].pass || !preInvariants["narrative + time"].pass;
    const mirrorAxis = mirrorNeeded ? pickMirrorAxis(axesBlend) : null;
    const { axesPostMirror, clampedAxes: mirrorClampedAxes } = applyMirrorAndClamp(axesBlend, mirrorAxis);
    const postInvariants = buildPairInvariants(axesPostMirror);
    const { axesFinal, dampedAxes, clampedAxes: lovelaceClampedAxes } = applyLovelace(axesPostMirror);

    series.push({
      beat,
      beat_label: BEAT_LABELS[beat] || `Beat ${beat + 1}`,
      seal_index: beat,
      axes_in: axesIn,
      axes_blend: axesBlend,
      axes_post_mirror: axesPostMirror,
      axes_final: axesFinal,
      gates_in: gateIn,
      gates_post_ok: postInvariants["chaos + order"].pass && postInvariants["narrative + time"].pass,
      gates_post_invariants: postInvariants,
      mirror_applied: mirrorNeeded,
      mirror_axis: mirrorAxis,
      lovelace_damped_axes: dampedAxes,
      clamped_axes: [...new Set([...mirrorClampedAxes, ...lovelaceClampedAxes])]
    });

    previousFinal = axesFinal;
  }

  const selectedSnapshot = selection?.selected_snapshot || null;
  const wasClamped = Object.fromEntries(
    AXES.map((axis) => [axis, series.map((beat) => beat.clamped_axes.includes(axis))])
  );

  return {
    schema_id: "mt07_kernel_session_packet.draft.v1",
    schema_status: "draft_sidecar",
    generated_at: bundle?.dashboard?.meta?.generated_at || new Date().toISOString(),
    kernel_id: "KERNEL-0.mt07-adapter.boundary-reflect.v1",
    harness_version: "MT07_SIDE_ADAPTER_DRAFT",
    ttl: BEATS_TOTAL,
    beats_total: BEATS_TOTAL,
    beat_labels: BEAT_LABELS,
    axes: AXES,
    clamp: { min: CLAMP_MIN, max: CLAMP_MAX },
    epsilon: EPSILON,
    tie_break_order: AXES,
    law: {
      mirrorpass: {
        mode: "boundary_reflect",
        trigger_conditions: ["gate_fail", "pair_invariant_fail"],
        pair_invariants: {
          "chaos + order": { min: -1, max: 1 },
          "narrative + time": { min: -2, max: 2 }
        }
      },
      smoothing: {
        enabled: true,
        source: "beat_blend_prev_final",
        prev_weight: BLEND_PREV_WEIGHT
      },
      lovelace_pass: {
        enabled: true,
        threshold: LOVELACE_THRESHOLD,
        scale: LOVELACE_SCALE,
        apply_when: "post_mirror"
      }
    },
    source_context: {
      processor_id: "MT-07",
      selection_policy: selection?.selection_policy || null,
      snapshot_id: selectedSnapshot?.id ?? null,
      snapshot_mode: selectedSnapshot?.mode ?? bundle?.dashboard?.meta?.mode ?? null,
      sample_state: sampleState,
      structural_basis: trace.structural_basis || null,
      window: bundle?.dashboard?.meta?.window || null
    },
    telemetry: {
      mirrorpass_ran: series.map((beat) => beat.mirror_applied),
      flipped_axis: series.map((beat) => beat.mirror_axis),
      gate_fail: series.map((beat) => !beat.gates_in.ok),
      lovelace_damped_axes: series.map((beat) => beat.lovelace_damped_axes),
      was_clamped: wasClamped
    },
    series,
    notes: [
      "Draft MT-07 adapter packet for sidecar replay verification.",
      "Derived from MT-07 snapshot history and trace; this packet does not replace dashboard field truth."
    ]
  };
}
