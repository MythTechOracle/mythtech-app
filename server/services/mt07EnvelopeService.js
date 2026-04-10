import { createHash } from "node:crypto";

function sha256(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function asJson(value) {
  return JSON.stringify(value ?? null);
}

function getCompositionShare(dashboard, key) {
  const item = (dashboard?.composition?.items || []).find((entry) => entry.key === key);
  return item ? Number((item.share || 0).toFixed(3)) : 0;
}

function buildArtifactHash(bundle, selection) {
  const selectedPayload = selection?.selected_snapshot?.payload_json;
  if (selectedPayload) {
    return sha256(selectedPayload);
  }

  return sha256(asJson(bundle));
}

function buildReliefTreeSignature(dashboard) {
  const tree = dashboard?.tree_of_relief || {};
  const lines = tree.lines || {};

  return {
    state: tree.state || dashboard?.trace?.moment_resolve_state || "unknown",
    checksum: sha256(asJson(lines)),
    source: "tree_of_relief"
  };
}

function deriveStatement(dashboard) {
  const tree = dashboard?.tree_of_relief?.lines || {};
  const structural = dashboard?.structural_read?.lines || {};

  return (
    tree.what_resolves ||
    tree.what_formed ||
    structural.current_structural_state ||
    "MT-07 produced a present-window read."
  );
}

function deriveBrittlenessReasons(dashboard, selection) {
  const reasons = [];
  const trace = dashboard?.trace || {};
  const metrics = dashboard?.metrics?.cards || [];
  const coherenceCard = metrics.find((card) => card.key === "cross_source_coherence");
  const uncertaintyCard = metrics.find((card) => card.key === "uncertainty_index");
  const selectedMode = selection?.selected_snapshot?.mode || dashboard?.meta?.mode || null;
  const sampleState = trace.sample_state || "unknown";

  if (selectedMode && selectedMode !== "live_api") {
    reasons.push("snapshot_not_live");
  }

  if (["empty", "extremely_thin", "thin"].includes(sampleState)) {
    reasons.push(`sample_${sampleState}`);
  }

  if (trace.surface_recovery_mode === "provisional") {
    reasons.push("surface_recovery_provisional");
  }

  if ((dashboard?.held_out_field?.held_out_count || 0) > (trace.visible_tape_cluster_count || 0)) {
    reasons.push("held_out_pressure");
  }

  if ((coherenceCard?.value || 0) < 0.45) {
    reasons.push("low_coherence");
  }

  if ((uncertaintyCard?.value || 0) >= 0.5) {
    reasons.push("high_uncertainty");
  }

  if ((dashboard?.structural_read?.basis || "") === "weak") {
    reasons.push("structural_basis_weak");
  }

  if ((dashboard?.structural_read?.basis || "") === "insufficient") {
    reasons.push("structural_basis_insufficient");
  }

  return [...new Set(reasons)];
}

function deriveHandoffState(dashboard, selection) {
  const trace = dashboard?.trace || {};
  const selectedMode = selection?.selected_snapshot?.mode || dashboard?.meta?.mode || null;
  const sampleState = trace.sample_state || "unknown";
  const structuralBasis = dashboard?.structural_read?.basis || null;

  if (selectedMode && selectedMode !== "live_api") {
    return "fallback";
  }

  if (dashboard?.system_status?.ingestion === "degraded") {
    return "degraded";
  }

  if (sampleState === "empty" || structuralBasis === "insufficient") {
    return "insufficient_basis";
  }

  if (sampleState === "extremely_thin" || sampleState === "thin") {
    return "thin";
  }

  if (sampleState === "limited" || trace.surface_recovery_mode === "provisional" || structuralBasis === "weak") {
    return "provisional";
  }

  return "ready";
}

function deriveNextHandoff(handoffState) {
  if (handoffState === "ready") {
    return "helper_lane_receiver";
  }

  if (handoffState === "provisional" || handoffState === "thin") {
    return "helper_lane_review";
  }

  return "hold_in_mt07";
}

export function buildMt07ResultEnvelope({ bundle, selection }) {
  const dashboard = bundle?.dashboard || {};
  const trace = dashboard?.trace || {};
  const handoffState = deriveHandoffState(dashboard, selection);
  const brittlenessReasons = deriveBrittlenessReasons(dashboard, selection);
  const selectedSnapshot = selection?.selected_snapshot || null;
  const artifactHash = buildArtifactHash(bundle, selection);

  return {
    schema_id: "mt07_result_envelope.draft.v1",
    schema_status: "draft_sidecar",
    ts: dashboard?.meta?.generated_at || new Date().toISOString(),
    processor_id: "MT-07",
    event: "result",
    packet_receipt: {
      snapshot_id: selectedSnapshot?.id ?? null,
      snapshot_mode: selectedSnapshot?.mode ?? dashboard?.meta?.mode ?? null,
      selection_policy: selection?.selection_policy ?? null,
      artifact_hash: artifactHash,
      window: {
        start: dashboard?.meta?.window?.start || null,
        end: dashboard?.meta?.window?.end || null,
        label: dashboard?.meta?.window?.label || null
      }
    },
    result: {
      statement: deriveStatement(dashboard),
      handoff_state: handoffState,
      next_handoff: deriveNextHandoff(handoffState),
      brittleness_flag: brittlenessReasons.length > 0,
      brittleness_reasons: brittlenessReasons,
      return_phase:
        trace.moment_resolve_state ||
        dashboard?.tree_of_relief?.state ||
        dashboard?.meta?.mode ||
        "situational_awareness",
      self_audit_id:
        selectedSnapshot?.id != null
          ? `snapshot:${selectedSnapshot.id}`
          : `artifact:${artifactHash.slice(0, 16)}`
    },
    relief_tree_signature: buildReliefTreeSignature(dashboard),
    axis_net: null,
    mirror_pass: null,
    current_surface: {
      mode: dashboard?.meta?.mode || null,
      sample_state: trace.sample_state || null,
      surface_recovery_mode: trace.surface_recovery_mode || null,
      visible_tape_cluster_count: trace.visible_tape_cluster_count ?? null,
      suppressed_cluster_count: trace.suppressed_cluster_count ?? null,
      structural_read_state: trace.structural_read_state || null,
      structural_basis: trace.structural_basis || null,
      tone_state: trace.tone_state || null,
      composition_projection: {
        security: getCompositionShare(dashboard, "security"),
        diplomacy: getCompositionShare(dashboard, "diplomacy"),
        infrastructure: getCompositionShare(dashboard, "infrastructure"),
        cyber: getCompositionShare(dashboard, "cyber")
      }
    },
    pending_fields: [
      "axis_net",
      "mirror_pass",
      "full_relief_tree_signature",
      "kernel_artifact_receipt"
    ],
    notes: [
      "Draft helper/handoff sidecar derived from the current MT-07 snapshot bundle.",
      "This envelope does not replace /api/dashboard and does not author operator-facing truth."
    ]
  };
}
