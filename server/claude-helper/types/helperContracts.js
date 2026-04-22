function cleanText(value, fallback = "", maxLength = 400) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text;
}

function cleanStringArray(value, { maxItems = 6, maxLength = 220 } = {}) {
  if (!Array.isArray(value)) return [];
  const items = [];

  for (const entry of value) {
    const cleaned = cleanText(entry, "", maxLength);
    if (!cleaned) continue;
    if (!items.includes(cleaned)) {
      items.push(cleaned);
    }
    if (items.length >= maxItems) {
      break;
    }
  }

  return items;
}

function normalizeScope(rawScope, inputScope) {
  const rawItems = Array.isArray(rawScope) ? rawScope : [];
  const allowed = rawItems.filter((scope) => inputScope.includes(scope));
  return allowed.length > 0 ? allowed : inputScope;
}

export const auditOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: {
      type: "string",
      const: "audit_note"
    },
    input_scope: {
      type: "array",
      items: { type: "string" },
      minItems: 1
    },
    summary: {
      type: "string"
    },
    observations: {
      type: "array",
      items: { type: "string" }
    },
    warnings: {
      type: "array",
      items: { type: "string" }
    },
    suggested_next_checks: {
      type: "array",
      items: { type: "string" }
    },
    confidence_note: {
      type: "string"
    },
    operator_review_required: {
      type: "boolean",
      const: true
    },
    supporting_paths: {
      type: "array",
      items: { type: "string" }
    },
    supporting_metrics: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: [
    "kind",
    "input_scope",
    "summary",
    "observations",
    "warnings",
    "suggested_next_checks",
    "confidence_note",
    "operator_review_required"
  ]
};

export function normalizeAuditOutput(rawValue, { inputScope, window, focus, helperEngine }) {
  return {
    kind: "audit_note",
    input_scope: normalizeScope(rawValue?.input_scope, inputScope),
    summary: cleanText(rawValue?.summary, "Read-only MT-07 audit completed.", 320),
    observations: cleanStringArray(rawValue?.observations, { maxItems: 6 }),
    warnings: cleanStringArray(rawValue?.warnings, { maxItems: 4 }),
    suggested_next_checks: cleanStringArray(rawValue?.suggested_next_checks, { maxItems: 4 }),
    confidence_note: cleanText(
      rawValue?.confidence_note,
      "Advisory helper output based on read-only app state.",
      220
    ),
    operator_review_required: true,
    supporting_paths: cleanStringArray(rawValue?.supporting_paths, {
      maxItems: 8,
      maxLength: 180
    }),
    supporting_metrics: cleanStringArray(rawValue?.supporting_metrics, {
      maxItems: 8,
      maxLength: 120
    }),
    window,
    focus,
    generated_at: new Date().toISOString(),
    helper_engine: helperEngine
  };
}
