import { metricCardOrder } from "./types.js";

const WINDOW_HOURS = 6;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toIso(date) {
  return date.toISOString();
}

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function buildWindow(hours = WINDOW_HOURS) {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);

  return {
    end: toIso(end),
    label: `${hours}h`,
    start: toIso(start),
  };
}

function buildMetricCards() {
  return [
    {
      key: "signal_velocity",
      label: "Signal Velocity",
      value: 78,
      display: "78 / 100",
      unit: "score",
      delta_vs_prior_window: 6,
      delta_direction: "up",
      status: "elevated",
      sparkline: [62, 64, 67, 72, 71, 78],
      explain_path: "/api/explain/metric/signal_velocity?window=6h",
    },
    {
      key: "volatility_index",
      label: "Volatility Index",
      value: 0.64,
      display: "0.64",
      unit: "ratio",
      delta_vs_prior_window: 0.08,
      delta_direction: "up",
      status: "elevated",
      sparkline: [0.42, 0.45, 0.48, 0.59, 0.61, 0.64],
      explain_path: "/api/explain/metric/volatility_index?window=6h",
    },
    {
      key: "source_diversity",
      label: "Source Diversity",
      value: 12,
      display: "12 feeds",
      unit: "count",
      delta_vs_prior_window: 2,
      delta_direction: "up",
      status: "healthy",
      sparkline: [9, 9, 10, 11, 11, 12],
      explain_path: "/api/explain/metric/source_diversity?window=6h",
    },
    {
      key: "escalation_pressure",
      label: "Escalation Pressure",
      value: 62,
      display: "62 / 100",
      unit: "score",
      delta_vs_prior_window: 7,
      delta_direction: "up",
      status: "elevated",
      sparkline: [41, 46, 49, 55, 58, 62],
      explain_path: "/api/explain/metric/escalation_pressure?window=6h",
    },
    {
      key: "correction_rate",
      label: "Correction Rate",
      value: 0.09,
      display: "9%",
      unit: "percent",
      delta_vs_prior_window: -0.03,
      delta_direction: "down",
      status: "improving",
      sparkline: [0.16, 0.15, 0.13, 0.12, 0.11, 0.09],
      explain_path: "/api/explain/metric/correction_rate?window=6h",
    },
    {
      key: "cross_source_coherence",
      label: "Cross-Source Coherence",
      value: 0.57,
      display: "0.57",
      unit: "ratio",
      delta_vs_prior_window: 0.05,
      delta_direction: "up",
      status: "mixed",
      sparkline: [0.41, 0.43, 0.46, 0.49, 0.53, 0.57],
      explain_path: "/api/explain/metric/cross_source_coherence?window=6h",
    },
    {
      key: "uncertainty_index",
      label: "Uncertainty Index",
      value: 0.38,
      display: "0.38",
      unit: "ratio",
      delta_vs_prior_window: -0.04,
      delta_direction: "down",
      status: "moderate",
      sparkline: [0.52, 0.49, 0.47, 0.44, 0.41, 0.38],
      explain_path: "/api/explain/metric/uncertainty_index?window=6h",
    },
  ];
}

function buildMockEventItems() {
  return [
    {
      event_id: "evt_001",
      cluster_id: "cl_lev_2201",
      observed_at: toIso(minutesAgo(14)),
      region: "Levant",
      category: "security",
      summary: "Multiple outlets report temporary airspace restrictions while the operating status is clarified.",
      severity: "high",
      confidence: 0.62,
      source_count: 4,
      confirmation_state: "emerging",
      correction_state: "none",
      primary_source_labels: ["Wire A", "Civil Aviation Desk"],
      detail_path: "/api/events?window=6h&event_id=evt_001",
    },
    {
      event_id: "evt_002",
      cluster_id: "cl_gulf_9911",
      observed_at: toIso(minutesAgo(42)),
      region: "Gulf",
      category: "diplomacy",
      summary: "Foreign ministry statement confirms technical talks are scheduled later this week.",
      severity: "medium",
      confidence: 0.81,
      source_count: 3,
      confirmation_state: "confirmed_multi_source",
      correction_state: "none",
      primary_source_labels: ["Ministry Feed"],
      detail_path: "/api/events?window=6h&event_id=evt_002",
    },
    {
      event_id: "evt_003",
      cluster_id: "cl_eu_3410",
      observed_at: toIso(minutesAgo(63)),
      region: "Central Europe",
      category: "infrastructure",
      summary: "Rail operator reports a regional signaling disruption with rolling service recovery.",
      severity: "medium",
      confidence: 0.76,
      source_count: 5,
      confirmation_state: "confirmed_multi_source",
      correction_state: "clarified",
      primary_source_labels: ["Transit Ops", "Wire C"],
      detail_path: "/api/events?window=6h&event_id=evt_003",
    },
    {
      event_id: "evt_004",
      cluster_id: "cl_pac_1204",
      observed_at: toIso(minutesAgo(91)),
      region: "Western Pacific",
      category: "maritime",
      summary: "Port authority warns of short-term congestion after weather-driven berth delays.",
      severity: "low",
      confidence: 0.68,
      source_count: 2,
      confirmation_state: "single_source",
      correction_state: "none",
      primary_source_labels: ["Port Ops"],
      detail_path: "/api/events?window=6h&event_id=evt_004",
    },
    {
      event_id: "evt_005",
      cluster_id: "cl_na_5531",
      observed_at: toIso(minutesAgo(135)),
      region: "North America",
      category: "cyber",
      summary: "A managed service provider issues an advisory for elevated credential stuffing activity.",
      severity: "high",
      confidence: 0.74,
      source_count: 6,
      confirmation_state: "confirmed_multi_source",
      correction_state: "none",
      primary_source_labels: ["Provider Advisory", "Security Wire"],
      detail_path: "/api/events?window=6h&event_id=evt_005",
    },
  ];
}

function buildDegradedEventItems() {
  return [
    {
      event_id: "evt_deg_001",
      cluster_id: "cl_deg_lev_2201",
      observed_at: toIso(minutesAgo(22)),
      region: "Levant",
      category: "security",
      summary: "Airspace restriction reports remain active, but the duration and operating status are still being reconciled.",
      severity: "high",
      confidence: 0.58,
      source_count: 2,
      confirmation_state: "emerging",
      correction_state: "none",
      primary_source_labels: ["Delayed Wire", "Civil Aviation Desk"],
      detail_path: "/api/events?window=6h&event_id=evt_deg_001",
    },
    {
      event_id: "evt_deg_002",
      cluster_id: "cl_deg_gulf_9911",
      observed_at: toIso(minutesAgo(55)),
      region: "Gulf",
      category: "diplomacy",
      summary: "Officials say technical talks are still expected, but sequencing and participation remain unclear.",
      severity: "medium",
      confidence: 0.74,
      source_count: 2,
      confirmation_state: "emerging",
      correction_state: "none",
      primary_source_labels: ["Ministry Feed"],
      detail_path: "/api/events?window=6h&event_id=evt_deg_002",
    },
    {
      event_id: "evt_deg_003",
      cluster_id: "cl_deg_eu_3410",
      observed_at: toIso(minutesAgo(86)),
      region: "Central Europe",
      category: "infrastructure",
      summary: "Regional rail signaling disruption persists while operator guidance remains partial and staggered.",
      severity: "medium",
      confidence: 0.71,
      source_count: 3,
      confirmation_state: "confirmed_multi_source",
      correction_state: "clarified",
      primary_source_labels: ["Transit Ops"],
      detail_path: "/api/events?window=6h&event_id=evt_deg_003",
    },
    {
      event_id: "evt_deg_004",
      cluster_id: "cl_deg_pac_1204",
      observed_at: toIso(minutesAgo(108)),
      region: "Western Pacific",
      category: "maritime",
      summary: "Port congestion warning remains in place after weather-driven delays and patchy berth-status updates.",
      severity: "low",
      confidence: 0.63,
      source_count: 1,
      confirmation_state: "single_source",
      correction_state: "none",
      primary_source_labels: ["Port Ops"],
      detail_path: "/api/events?window=6h&event_id=evt_deg_004",
    },
    {
      event_id: "evt_deg_005",
      cluster_id: "cl_deg_na_5531",
      observed_at: toIso(minutesAgo(144)),
      region: "North America",
      category: "cyber",
      summary: "Managed service provider advisory remains active, but downstream corroboration is delayed across partner feeds.",
      severity: "high",
      confidence: 0.69,
      source_count: 3,
      confirmation_state: "emerging",
      correction_state: "none",
      primary_source_labels: ["Provider Advisory"],
      detail_path: "/api/events?window=6h&event_id=evt_deg_005",
    },
  ];
}

function buildMockHeldOutField() {
  return {
    title: "Held-Out Field",
    subtitle: "What was seen but refused",
    held_out_count: 7,
    summary_note: "7 clusters were seen but held out of visible appearance.",
    top_suppression_reasons: [
      { reason_code: "low_field_authority", count: 3 },
      { reason_code: "single_family_low_confidence", count: 2 },
      { reason_code: "diplomacy_requires_more_support", count: 2 },
    ],
    items: [
      {
        cluster_id: "cl_hold_lev_01",
        region: "Levant",
        country: null,
        category: "security",
        observed_update: "Border security bulletin cites localized exchange with limited corroboration.",
        severity: "medium",
        confidence: 0.71,
        source_count: 1,
        source_family_count: 1,
        signal_strength: 0.58,
        primary_suppression_reason: "single_family_low_confidence",
        suppression_reasons: ["single_family_low_confidence"],
      },
      {
        cluster_id: "cl_hold_gulf_02",
        region: "Gulf",
        country: null,
        category: "diplomacy",
        observed_update: "Official comment hints at further talks but lacks wider confirming support.",
        severity: "low",
        confidence: 0.74,
        source_count: 2,
        source_family_count: 1,
        signal_strength: 0.54,
        primary_suppression_reason: "diplomacy_requires_more_support",
        suppression_reasons: ["diplomacy_requires_more_support"],
      },
      {
        cluster_id: "cl_hold_eu_03",
        region: "Central Europe",
        country: null,
        category: "infrastructure",
        observed_update: "地区停电通告仍过于本地化，未能获得场域权威。",
        observed_update_original: "地区停电通告仍过于本地化，未能获得场域权威。",
        observed_update_translated: "Regional outage notice remained too local to earn field authority.",
        severity: "medium",
        confidence: 0.76,
        source_count: 2,
        source_family_count: 1,
        signal_strength: 0.51,
        primary_suppression_reason: "low_field_authority",
        suppression_reasons: ["low_field_authority"],
        translation: {
          applied: true,
          source_language: "zh-CN",
          source_language_label: "Chinese",
          note: "Machine-translated to English from Chinese",
          provider: "google-translate-web"
        }
      },
    ],
  };
}

function buildDegradedHeldOutField() {
  return {
    title: "Held-Out Field",
    subtitle: "What was seen but refused",
    held_out_count: 9,
    summary_note: "9 clusters were seen but held out while delayed feeds limited confirmation and authority.",
    top_suppression_reasons: [
      { reason_code: "single_family_low_confidence", count: 4 },
      { reason_code: "low_field_authority", count: 3 },
      { reason_code: "missing_location", count: 2 },
    ],
    items: [
      {
        cluster_id: "cl_deg_hold_lev_01",
        region: "Levant",
        country: null,
        category: "security",
        observed_update: "Local exchange report remained under-supported while delayed wires withheld stronger confirmation.",
        severity: "medium",
        confidence: 0.66,
        source_count: 1,
        source_family_count: 1,
        signal_strength: 0.49,
        primary_suppression_reason: "single_family_low_confidence",
        suppression_reasons: ["single_family_low_confidence"],
      },
      {
        cluster_id: "cl_deg_hold_gulf_02",
        region: "Gulf",
        country: null,
        category: "diplomacy",
        observed_update: "Short diplomatic notice lacked enough geography and counterpart detail to surface cleanly.",
        severity: "low",
        confidence: 0.68,
        source_count: 1,
        source_family_count: 1,
        signal_strength: 0.46,
        primary_suppression_reason: "missing_location",
        suppression_reasons: ["missing_location", "low_field_authority"],
      },
      {
        cluster_id: "cl_deg_hold_pac_03",
        region: "Western Pacific",
        country: null,
        category: "maritime",
        observed_update: "Shipping delay bulletin remained too operational and weakly corroborated to earn appearance.",
        severity: "low",
        confidence: 0.64,
        source_count: 1,
        source_family_count: 1,
        signal_strength: 0.43,
        primary_suppression_reason: "low_field_authority",
        suppression_reasons: ["low_field_authority"],
      },
    ],
  };
}

function buildFixtureToneMetrics(mode = "mock") {
  if (mode === "degraded") {
    return {
      top_tone_display: "guarded",
      top_tone_confidence: 0.44,
      tone_entropy_norm: 0.88,
      tone_state: "diffuse",
      basis_cluster_count: 5,
      basis_visible_count: 3,
      summary_note: "Language posture is diffuse, leaning guarded; delayed feeds keep the tone read provisional.",
    };
  }

  if (mode === "empty") {
    return {
      top_tone_display: null,
      top_tone_confidence: 0,
      tone_entropy_norm: 1,
      tone_state: "insufficient_basis",
      basis_cluster_count: 0,
      basis_visible_count: 0,
      summary_note: "Tone basis is too thin to support a stable language-pressure read.",
    };
  }

  return {
    top_tone_display: "hardening",
    top_tone_confidence: 0.58,
    tone_entropy_norm: 0.66,
    tone_state: "mixed",
    basis_cluster_count: 5,
    basis_visible_count: 5,
    summary_note: "Language posture is mixed, leaning hardening; it does not overrule the field.",
  };
}

function buildFixtureTreeOfRelief(mode = "mock") {
  const toneMetrics = buildFixtureToneMetrics(mode);

  if (mode === "degraded") {
    return {
      title: "Tree of Relief — Moment Resolve",
      subtitle: "Narrative audit of the present window, not a forecast.",
      state: "degraded",
      state_label: "Degraded",
      lines: {
        what_formed: "A fallback continuity surface is carrying the board while live detail is constrained.",
        what_held: "Delayed feeds reduced confirmation, comparison strength, and field authority across the window.",
        what_resolves: "Read this cycle as operationally useful but partially degraded.",
        what_remains_open: `${toneMetrics.summary_note} More may be present than the current surface can verify.`
      }
    };
  }

  if (mode === "empty") {
    return {
      title: "Tree of Relief — Moment Resolve",
      subtitle: "Narrative audit of the present window, not a forecast.",
      state: "thin",
      state_label: "Thin Field",
      lines: {
        what_formed: "No visible clusters earned appearance in the active window; the field remained observationally thin.",
        what_held: "Supporting candidates stayed limited, so little else could earn visible appearance.",
        what_resolves: `Read this cycle as narrow and provisional, not as a broad field conclusion. ${toneMetrics.summary_note}`,
        what_remains_open: "The field may still be moving, but this window does not justify a larger claim."
      }
    };
  }

  return {
    title: "Tree of Relief — Moment Resolve",
    subtitle: "Narrative audit of the present window, not a forecast.",
    state: "broad",
    state_label: "Broad Field",
    lines: {
      what_formed: "A multi-domain field took shape with visible activity across security, diplomacy, infrastructure, and cyber lanes.",
      what_held: "Selection remained strict, but enough authority survived to show a wider field rather than a single-thread surface.",
      what_resolves: `Read this cycle as materially active and broader than a single-thread window. ${toneMetrics.summary_note}`,
      what_remains_open: "The field is wider than usual, but individual clusters still carry uneven certainty."
    }
  };
}

function buildFixtureStructuralRead(mode = "mock") {
  if (mode === "degraded") {
    return {
      title: "Structural Read",
      subtitle: "Analytical map of the present window, not a forecast.",
      state: "degraded",
      state_label: "Degraded",
      basis: "weak",
      basis_label: "weak",
      lines: {
        active_domain: "Fallback continuity surface with partially constrained live authority.",
        load_bearing_factors: "degraded-mode continuity surface; delayed-feed awareness; operator-safe fallback",
        constraint_factors: "delayed feeds; reduced comparison strength; weaker field authority",
        held_out_pressure: "Held-out pressure remains visible, but the degraded surface cannot compress it with full authority.",
        current_structural_state: "fallback continuity surface; structurally useful, not full live authority.",
        open_edge: "More may be present than the current surface can safely compress."
      }
    };
  }

  if (mode === "empty") {
    return {
      title: "Structural Read",
      subtitle: "Analytical map of the present window, not a forecast.",
      state: "insufficient_basis",
      state_label: "Insufficient Basis",
      basis: "insufficient",
      basis_label: "insufficient",
      lines: {
        active_domain: "Sparse visible field with pressure held below appearance.",
        load_bearing_factors: "strict gating; no visible basis cluster; window-level thinness",
        constraint_factors: "low visible authority; little present structure to compress; active field remains mostly refused",
        held_out_pressure: "The field may be active underneath, but this window did not surface enough earned appearance to justify structural compression.",
        current_structural_state: "insufficient structural basis; the window does not support compression beyond thin-state notes.",
        open_edge: "Wait for a denser window before assigning stronger structure."
      }
    };
  }

  return {
    title: "Structural Read",
    subtitle: "Analytical map of the present window, not a forecast.",
    state: "mixed_watch",
    state_label: "Mixed Watch",
    basis: "sufficient",
    basis_label: "sufficient",
    lines: {
      active_domain: "Mixed visible field with security pressure and diplomacy materially present.",
      load_bearing_factors: "multi-domain visible field; good-enough coherence for guarded compression; watch-level pressure still active",
      constraint_factors: "held-out pressure remains meaningful; visible authority is not fully settled; some strain remains beneath the surface",
      held_out_pressure: "Refused clusters are present beneath the surfaced field, so visible calm does not equal full structural resolution.",
      current_structural_state: "balanced but brittle; pressure is active, but constraints are still materially present.",
      open_edge: "The field has shape, but it is not yet structurally settled."
    }
  };
}

function buildExplainMap() {
  return {
    signal_velocity: {
      label: "Signal Velocity",
      definition: "Weighted cluster activity score for the active window.",
      drivers: [
        {
          cluster_id: "cl_lev_2201",
          headline: "Airspace restrictions under clarification",
          contribution: 0.1,
        },
        {
          cluster_id: "cl_na_5531",
          headline: "Credential activity advisory expands source participation",
          contribution: 0.07,
        },
      ],
      caveats: [
        "Signal velocity describes observed throughput only.",
        "Velocity should not be interpreted as forecast direction.",
      ],
    },
    volatility_index: {
      metric_key: "volatility_index",
      label: "Volatility Index",
      window: "6h",
      value: 0.64,
      definition: "Measures dispersion across event intensity and correction cadence.",
      formula_human: "Weighted severity total divided by active cluster count, bounded to 0..1.",
      inputs: {
        cluster_count: 5,
        weighted_severity_total: 8,
        correction_cluster_count: 1,
      },
      tone_context: {
        top_tone_display: "hardening",
        top_tone_confidence: 0.58,
        tone_entropy_norm: 0.66,
        tone_state: "mixed",
        summary_note: "Language posture is mixed, leaning hardening; it does not overrule the field.",
      },
      drivers: [
        {
          cluster_id: "cl_lev_2201",
          headline: "Rapid update clustering is widening short-window variance",
          contribution: 0.08,
        },
      ],
      caveats: [
        "Volatility rises with update density, not just event severity.",
        "Tone describes rhetorical posture only and does not change volatility scoring in this pass.",
      ],
    },
    source_diversity: {
      label: "Source Diversity",
      definition: "Counts distinct contributing feeds participating in qualified clusters.",
      driver_columns: [
        { key: "feed", label: "Feed", width: "34%" },
        { key: "sample_update", label: "Sample update", width: "50%" },
        { key: "cluster_count", label: "Clusters", width: "16%" },
      ],
      drivers: [
        {
          feed: "Provider Advisory",
          sample_update: "Credential activity advisory expands source participation",
          cluster_count: 2,
        },
        {
          feed: "Security Wire",
          sample_update: "Credential activity advisory expands source participation",
          cluster_count: 2,
        },
        {
          feed: "Civil Aviation Desk",
          sample_update: "Airspace restrictions under clarification",
          cluster_count: 1,
        },
        {
          feed: "Ministry Feed",
          sample_update: "Technical talks cluster carries diplomatic crisis and policy-pressure texture",
          cluster_count: 1,
        },
      ],
      caveats: [
        "Showing all distinct feeds observed in qualified clusters.",
        "More feeds improve breadth but do not guarantee correctness.",
      ],
    },
    escalation_pressure: {
      label: "Escalation Pressure",
      definition: "Descriptive hardening score for state-linked, cross-border, retaliatory, or strategically pressured activity in the active window.",
      tone_context: {
        top_tone_display: "hardening",
        top_tone_confidence: 0.58,
        tone_entropy_norm: 0.66,
        tone_state: "mixed",
        summary_note: "Language posture is mixed, leaning hardening; it does not overrule support or escalation authority.",
      },
      drivers: [
        {
          cluster_id: "cl_lev_2201",
          headline: "Airspace restrictions under clarification (Cross-border action, State actor presence)",
          contribution: 0.18,
        },
        {
          cluster_id: "cl_gulf_9911",
          headline: "Technical talks cluster carries diplomatic crisis and policy-pressure texture",
          contribution: 0.14,
        },
      ],
      caveats: [
        "Infrastructure strain alone does not imply escalation pressure.",
        "Escalation Pressure is descriptive only and not a conflict forecast.",
        "Tone may describe rhetorical posture, but it does not overrule support or escalation authority.",
      ],
      temporal_read: {
        current_6h: {
          window: "6h",
          value: 62,
          display: "62 / 100",
          status: "elevated",
          contributor_count: 2,
          visible_contributor_count: 2,
          sample_state: "sufficient",
        },
        residue_24h: {
          window: "24h",
          value: 55,
          display: "55 / 100",
          status: "elevated",
          contributor_count: 5,
          visible_contributor_count: 5,
          sample_state: "sufficient",
        },
        continuity_72h: {
          window: "72h",
          value: 47,
          display: "47 / 100",
          status: "watch",
          contributor_count: 9,
          visible_contributor_count: 8,
          sample_state: "sufficient",
        },
        temporal_state: "watch_now_persistent",
        temporal_note: "Watch now; pressure persists across wider windows.",
      },
      summary_temporal:
        "Escalation is active in the current window and remains present across recent and wider windows.",
      operator_audit: {
        current_value: 62,
        current_display: "62 / 100",
        current_status: "elevated",
        visible_sample_state: "sufficient",
        visible_escalation_contributor_count: 2,
        suppressed_escalation_contributor_count: 0,
        top_contributing_clusters: [
          {
            cluster_id: "cl_lev_2201",
            region: "Levant",
            category: "security",
            observed_update: "Airspace restrictions under clarification",
            escalation_signal: 0.33,
            source_family_count: 3,
          },
          {
            cluster_id: "cl_gulf_9911",
            region: "Gulf",
            category: "diplomacy",
            observed_update: "Technical talks cluster carries diplomatic crisis and policy-pressure texture",
            escalation_signal: 0.28,
            source_family_count: 2,
          },
        ],
        top_explain_drivers: [
          {
            cluster_id: "cl_lev_2201",
            headline: "Cross-border action and state-linked pressure raised escalation weight",
            contribution: 0.18,
          },
          {
            cluster_id: "cl_gulf_9911",
            headline: "Diplomatic crisis and policy pressure kept escalation elevated",
            contribution: 0.14,
          },
        ],
        strain_without_hardening_example: {
          cluster_id: "cl_eu_3410",
          region: "Central Europe",
          category: "infrastructure",
          observed_update: "Rail operator reports a regional signaling disruption with rolling service recovery",
          escalation_signal: 0.12,
        },
        hardening_without_infrastructure_dominance_example: {
          cluster_id: "cl_lev_2201",
          region: "Levant",
          category: "security",
          observed_update: "Airspace restrictions under clarification",
          escalation_signal: 0.33,
        },
      },
    },
    tone_pressure: {
      metric_key: "tone_pressure",
      label: "Tone Pressure",
      window: "6h",
      value: 0.66,
      definition: "Describes how concentrated or diffuse the field's live language posture is in the active window.",
      formula_human: "Weighted cluster tone distribution summarized by top tone, confidence, and normalized tone entropy.",
      inputs: {
        basis_cluster_count: 5,
        basis_visible_count: 5,
        top_tone_display: "hardening",
        top_tone_confidence: 0.58,
        tone_entropy_norm: 0.66,
      },
      tone_context: {
        top_tone_display: "hardening",
        top_tone_confidence: 0.58,
        tone_entropy_norm: 0.66,
        tone_state: "mixed",
        summary_note: "Language posture is mixed, leaning hardening; it does not overrule the field.",
      },
      driver_columns: [
        { key: "cluster_id", label: "Cluster", width: "18%" },
        { key: "headline", label: "Headline", width: "46%" },
        { key: "tone_posture", label: "Tone posture", width: "16%" },
        { key: "confidence", label: "Confidence", width: "10%" },
        { key: "entropy", label: "Entropy", width: "10%" },
      ],
      drivers: [
        {
          cluster_id: "cl_lev_2201",
          headline: "Airspace restrictions under clarification",
          tone_posture: "hardening",
          confidence: "61%",
          entropy: "0.58",
        },
        {
          cluster_id: "cl_gulf_9911",
          headline: "Technical talks cluster carries diplomatic crisis and policy-pressure texture",
          tone_posture: "guarded",
          confidence: "49%",
          entropy: "0.72",
        },
      ],
      caveats: [
        "Tone reads wording pressure, not event truth.",
        "High tone concentration is not the same thing as high event confidence.",
        "Tone remains descriptive-only and does not affect tape appearance in this pass.",
      ],
    },
    correction_rate: {
      metric_key: "correction_rate",
      label: "Correction Rate",
      window: "6h",
      value: 0.09,
      definition: "Tracks how often the active window required clarifications or reversals.",
      formula_human: "Correction-tracked cluster count divided by active cluster count.",
      inputs: {
        cluster_count: 5,
        correction_cluster_count: 1,
      },
      drivers: [
        {
          cluster_id: "cl_eu_3410",
          headline: "Transit operator clarified the original outage scope",
          contribution: 0.03,
        },
      ],
      caveats: [
        "A low correction rate does not imply high certainty by itself.",
      ],
    },
    cross_source_coherence: {
      label: "Cross-Source Coherence",
      definition: "Estimates agreement across independent sources for the same cluster.",
      drivers: [
        {
          cluster_id: "cl_gulf_9911",
          headline: "Diplomatic reporting aligned across official and media feeds",
          contribution: 0.06,
        },
      ],
      caveats: [
        "Coherence can fall when feeds are delayed rather than contradictory.",
      ],
    },
    uncertainty_index: {
      label: "Uncertainty Index",
      definition: "Composite view of missing details, conflicting specifics, and source lag.",
      drivers: [
        {
          cluster_id: "cl_lev_2201",
          headline: "Airspace notice still lacks final duration details",
          contribution: 0.05,
        },
      ],
      caveats: [
        "Lower uncertainty is still descriptive and not predictive.",
      ],
    },
  };
}

function buildFixtureSignalCycle({
  rawItemCount,
  clusterCount,
  admittedCount,
  heldOutCount,
  correctionCount,
  signalVelocity,
  treeState
}) {
  return {
    title: "Signal Cycle",
    subtitle: "Evidence path for the active window",
    authority: "audit_display_only",
    summary: `${rawItemCount} incoming items -> ${clusterCount} clusters -> ${admittedCount} admitted -> ${heldOutCount} held out -> ${correctionCount} corrections`,
    steps: [
      {
        key: "incoming_sources",
        label: "Incoming sources",
        value: rawItemCount,
        note: "Raw intake observed"
      },
      {
        key: "cluster_compare",
        label: "Cluster and compare",
        value: clusterCount,
        note: "Event-shaped clusters"
      },
      {
        key: "admit_hold",
        label: "Admit or hold out",
        value: `${admittedCount} / ${heldOutCount}`,
        note: "Visible / refused"
      },
      {
        key: "update_metrics",
        label: "Update metrics",
        value: signalVelocity,
        note: "Signal velocity"
      },
      {
        key: "mirror_correction",
        label: "Mirror correction audit",
        value: correctionCount,
        note: "Correction clusters"
      },
      {
        key: "tree_of_relief",
        label: "Tree of Relief",
        value: treeState,
        note: "Current-window resolve"
      }
    ]
  };
}

function buildBaseDashboard() {
  const window = buildWindow();

  return {
    meta: {
      api_version: "1.0.0",
      generated_at: window.end,
      window,
      refresh_seconds: 300,
      mode: "situational_awareness",
      predictive: false,
      timezone: "UTC",
    },
    banner: {
      title: "Live Signals Overlay",
      subtitle: "Descriptive monitoring layer for event intensity, source mix, and correction-aware signal flow.",
      disclaimer:
        "This dashboard summarizes observed signals in the active window. It does not forecast outcomes or assign future probabilities.",
    },
    metrics: {
      cards: buildMetricCards(),
    },
    composition: {
      title: "Signal Composition",
      basis: "event_clusters",
      items: [
        {
          key: "security",
          label: "Security incidents",
          count: 34,
          cluster_count: 34,
          share: 0.34,
          display: "34%",
          event_path: "/api/events?window=6h&category=security",
        },
        {
          key: "diplomacy",
          label: "Diplomatic updates",
          count: 29,
          cluster_count: 29,
          share: 0.29,
          display: "29%",
          event_path: "/api/events?window=6h&category=diplomacy",
        },
        {
          key: "infrastructure",
          label: "Infrastructure disruptions",
          count: 18,
          cluster_count: 18,
          share: 0.18,
          display: "18%",
          event_path: "/api/events?window=6h&category=infrastructure",
        },
        {
          key: "cyber",
          label: "Cyber advisories",
          count: 19,
          cluster_count: 19,
          share: 0.19,
          display: "19%",
          event_path: "/api/events?window=6h&category=cyber",
        },
      ],
    },
    recent_events: {
      title: "Visible Event Tape",
      sort: "signal_strength_then_recency",
      sort_note: "Strength-ranked, then recency",
      items: buildMockEventItems(),
    },
    held_out_field: buildMockHeldOutField(),
    signal_cycle: buildFixtureSignalCycle({
      rawItemCount: 28,
      clusterCount: 12,
      admittedCount: 5,
      heldOutCount: 7,
      correctionCount: 1,
      signalVelocity: 78,
      treeState: "contained"
    }),
    tone_metrics: buildFixtureToneMetrics("mock"),
    tree_of_relief: buildFixtureTreeOfRelief("mock"),
    structural_read: buildFixtureStructuralRead("mock"),
    notes: {
      title: "Volatility Notes",
      items: [
        "Volatility remains elevated due to dense update clustering in security and cyber lanes.",
        "Coherence improved after infrastructure clarifications reduced disagreement.",
        "This view is descriptive only and does not provide directional forecasts.",
      ],
    },
    method_snapshot: {
      title: "Method Snapshot",
      items: [
        "Time window: rolling 6 hours.",
        "Clusters are counted instead of individual headlines.",
        "Confidence scores represent evidence quality, not future certainty.",
        "Mock correction sample: one visible infrastructure cluster is marked clarified and reflected in Correction Rate.",
      ],
    },
    system_status: {
      ingestion: "healthy",
      notes: [],
    },
  };
}

function buildHistorySeries() {
  return {
    signal_velocity: { baseline_24h_avg: 66, baseline_7d_avg: 61, points: [62, 64, 67, 72, 71, 78] },
    volatility_index: { baseline_24h_avg: 0.47, baseline_7d_avg: 0.41, points: [0.42, 0.45, 0.48, 0.59, 0.61, 0.64] },
    source_diversity: { baseline_24h_avg: 11, baseline_7d_avg: 10, points: [9, 9, 10, 11, 11, 12] },
    escalation_pressure: { baseline_24h_avg: 55, baseline_7d_avg: 49, points: [41, 46, 49, 55, 58, 62] },
    correction_rate: { baseline_24h_avg: 0.12, baseline_7d_avg: 0.15, points: [0.16, 0.15, 0.13, 0.12, 0.11, 0.09] },
    cross_source_coherence: { baseline_24h_avg: 0.49, baseline_7d_avg: 0.45, points: [0.41, 0.43, 0.46, 0.49, 0.53, 0.57] },
    uncertainty_index: { baseline_24h_avg: 0.44, baseline_7d_avg: 0.49, points: [0.52, 0.49, 0.47, 0.44, 0.41, 0.38] },
  };
}

export function getDashboardFixture(mode = "mock") {
  const dashboard = buildBaseDashboard();

  if (mode === "degraded") {
    dashboard.metrics.cards = dashboard.metrics.cards.map((card) =>
      card.key === "cross_source_coherence"
        ? {
            ...card,
            value: null,
            display: "Unavailable",
            delta_vs_prior_window: null,
            delta_direction: "flat",
            status: "degraded",
            sparkline: [],
          }
        : card
    );
    dashboard.recent_events.items = buildDegradedEventItems();
    dashboard.held_out_field = buildDegradedHeldOutField();
    dashboard.signal_cycle = buildFixtureSignalCycle({
      rawItemCount: 24,
      clusterCount: 14,
      admittedCount: 5,
      heldOutCount: 9,
      correctionCount: 1,
      signalVelocity: 78,
      treeState: "thin"
    });
    dashboard.tone_metrics = buildFixtureToneMetrics("degraded");
    dashboard.tree_of_relief = buildFixtureTreeOfRelief("degraded");
    dashboard.structural_read = buildFixtureStructuralRead("degraded");
    dashboard.system_status = {
      ingestion: "degraded",
      notes: ["2 of 12 feeds are delayed beyond SLA."],
    };
    dashboard.notes.items.unshift("Feed delays are suppressing coherence detail.");
    return dashboard;
  }

  if (mode === "empty") {
    dashboard.metrics.cards = [];
    dashboard.composition.items = [];
    dashboard.recent_events.items = [];
    dashboard.signal_cycle = buildFixtureSignalCycle({
      rawItemCount: 0,
      clusterCount: 0,
      admittedCount: 0,
      heldOutCount: 0,
      correctionCount: 0,
      signalVelocity: 0,
      treeState: "empty"
    });
    dashboard.held_out_field.held_out_count = 0;
    dashboard.held_out_field.summary_note = "No held-out clusters in this window.";
    dashboard.held_out_field.top_suppression_reasons = [];
    dashboard.held_out_field.items = [];
    dashboard.tone_metrics = buildFixtureToneMetrics("empty");
    dashboard.tree_of_relief = buildFixtureTreeOfRelief("empty");
    dashboard.structural_read = buildFixtureStructuralRead("empty");
    dashboard.notes.items = ["No qualifying signal clusters were observed in the active window."];
    return dashboard;
  }

  return dashboard;
}

export function getHistoryFixture(mode = "mock") {
  if (mode === "empty") {
    return { series: {} };
  }

  const history = { series: buildHistorySeries() };
  if (mode === "degraded") {
    history.series.cross_source_coherence = {
      baseline_24h_avg: null,
      baseline_7d_avg: null,
      points: [],
    };
  }

  return history;
}

export function getExplainFixture(mode = "mock") {
  if (mode === "empty") {
    return {
      ...Object.fromEntries(
        metricCardOrder.map((key) => [
          key,
          {
            label: key.replace(/_/g, " "),
            definition: "No explain payload is available for an empty window.",
            drivers: [],
            caveats: ["No active clusters were observed in the selected window."],
          },
        ])
      ),
      tone_pressure: {
        metric_key: "tone_pressure",
        label: "Tone Pressure",
        definition: "No tone explain payload is available for an empty window.",
        tone_context: buildFixtureToneMetrics("empty"),
        drivers: [],
        caveats: ["Tone basis is too thin to support a stable language-pressure read."],
      },
    };
  }

  const explains = buildExplainMap();
  if (mode === "degraded") {
    explains.volatility_index.tone_context = buildFixtureToneMetrics("degraded");
    explains.escalation_pressure.tone_context = {
      ...buildFixtureToneMetrics("degraded"),
      summary_note: "Language posture is diffuse, leaning guarded; it does not overrule support or escalation authority.",
    };
    explains.tone_pressure.tone_context = buildFixtureToneMetrics("degraded");
    explains.cross_source_coherence = {
      label: "Cross-Source Coherence",
      definition: "Explanation is partially available while feeds are delayed.",
      drivers: [],
      caveats: [
        "Delayed feeds can reduce visible drivers for coherence.",
      ],
    };
  }

  return explains;
}

export const mockDashboardResponse = getDashboardFixture("mock");
export const degradedDashboardResponse = getDashboardFixture("degraded");
export const emptyDashboardResponse = getDashboardFixture("empty");
export const historyFallback = getHistoryFixture("mock");
export const degradedMetricsHistory = getHistoryFixture("degraded");
export const emptyMetricsHistory = getHistoryFixture("empty");
export const metricExplainByKey = getExplainFixture("mock");
export const mockMetricExplain = deepClone(metricExplainByKey.signal_velocity);
export const degradedMetricExplain = deepClone(getExplainFixture("degraded").cross_source_coherence);
export const emptyMetricExplain = deepClone(getExplainFixture("empty").signal_velocity);
export const explainFallback = deepClone(metricExplainByKey.signal_velocity);
