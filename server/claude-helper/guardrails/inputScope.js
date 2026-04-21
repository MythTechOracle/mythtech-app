const ALLOWED_AUDIT_SCOPES = new Set([
  "dashboard",
  "health",
  "snapshot_selection",
  "snapshot_bundle",
  "mt07_envelope"
]);

export const DEFAULT_AUDIT_SCOPES = [
  "dashboard",
  "health",
  "snapshot_selection",
  "mt07_envelope"
];

const MAX_INCLUDE_SCOPES = 5;
const DEFAULT_WINDOW = "6h";
const DEFAULT_FOCUS = "field_restraint";

export function getAllowedAuditScopes() {
  return [...ALLOWED_AUDIT_SCOPES];
}

export function normalizeAuditWindow(value) {
  const window = String(value || DEFAULT_WINDOW).trim();
  return window || DEFAULT_WINDOW;
}

export function normalizeAuditFocus(value) {
  const focus = String(value || DEFAULT_FOCUS).trim().replace(/\s+/g, "_");
  if (!focus) return DEFAULT_FOCUS;
  if (focus.length > 80) {
    throw new Error("Audit focus must stay under 80 characters.");
  }
  return focus;
}

export function normalizeAuditIncludeScopes(include) {
  const input = Array.isArray(include) ? include : DEFAULT_AUDIT_SCOPES;
  const scopes = [];

  for (const rawValue of input) {
    const scope = String(rawValue || "").trim();
    if (!scope) continue;
    if (!ALLOWED_AUDIT_SCOPES.has(scope)) {
      throw new Error(`Unsupported audit input scope "${scope}".`);
    }
    if (!scopes.includes(scope)) {
      scopes.push(scope);
    }
  }

  const normalized = scopes.length > 0 ? scopes : [...DEFAULT_AUDIT_SCOPES];
  if (normalized.length > MAX_INCLUDE_SCOPES) {
    throw new Error(`Audit include list may not exceed ${MAX_INCLUDE_SCOPES} scopes.`);
  }

  return normalized;
}
