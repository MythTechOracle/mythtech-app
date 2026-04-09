const DEFAULT_BASE_URL = "https://acleddata.com/api/";
const DEFAULT_ENDPOINT = "acled/read";
const DEFAULT_LIMIT = 250;
const DEFAULT_TIMEOUT_MS = 30000;

export const DEFAULT_FIELDS = [
  "event_id_cnty",
  "event_date",
  "timestamp",
  "event_type",
  "sub_event_type",
  "actor1",
  "actor2",
  "country",
  "admin1",
  "admin2",
  "admin3",
  "location",
  "latitude",
  "longitude",
  "source",
  "notes",
  "fatalities"
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function mapAcledEventTypeToCategory(eventType, subEventType) {
  const e = String(eventType || "").toLowerCase();
  const s = String(subEventType || "").toLowerCase();

  if (
    e.includes("explosions") ||
    e.includes("violence against civilians") ||
    e.includes("battles") ||
    s.includes("shelling") ||
    s.includes("air/drone strike") ||
    s.includes("attack")
  ) {
    return "security";
  }

  if (
    e.includes("strategic developments") &&
    (s.includes("agreement") || s.includes("negotiation") || s.includes("ceasefire") || s.includes("peace"))
  ) {
    return "diplomacy";
  }

  if (s.includes("infrastructure") || s.includes("headquarters") || s.includes("disrupted weapons use")) {
    return "infrastructure";
  }

  if (s.includes("cyber") || s.includes("communications") || s.includes("internet")) {
    return "cyber";
  }

  if (s.includes("sanction") || s.includes("policy") || s.includes("economic")) {
    return "policy";
  }

  return "information";
}

export function mapFatalitiesToSeverityHint(fatalities) {
  const count = Number(fatalities || 0);
  if (!Number.isFinite(count) || count <= 0) return 0.2;
  if (count >= 25) return 0.95;
  if (count >= 10) return 0.8;
  if (count >= 3) return 0.6;
  return 0.4;
}

function parseUnixLikeTimestamp(value) {
  if (value == null || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const stringValue = String(value).trim();

  if (/^\d{13}$/.test(stringValue)) {
    const date = new Date(Number(stringValue));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (/^\d{10}$/.test(stringValue)) {
    const date = new Date(Number(stringValue) * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const date = new Date(stringValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeAcledTimestampToIso(value) {
  return parseUnixLikeTimestamp(value);
}

export function buildAcledTitle(row) {
  const parts = [row.event_type, row.sub_event_type, row.location || row.admin1 || row.country].filter(Boolean);
  return parts.join(" | ") || "ACLED event";
}

export function mapAcledRowToRawItem(row, options = {}) {
  const observedAt = options.observedAt || new Date().toISOString();
  const liveTimestamp = normalizeAcledTimestampToIso(row.timestamp);

  return {
    source_name: "ACLED",
    source_type: "acled",
    query_basket: "acled",
    external_id: row.event_id_cnty || null,
    observed_at: observedAt,
    published_at: liveTimestamp || observedAt,
    title: buildAcledTitle(row),
    summary: row.notes || null,
    url: null,
    region: row.admin1 || row.location || row.country || "Unknown",
    country: row.country || null,
    lat: row.latitude != null ? Number(row.latitude) : null,
    lon: row.longitude != null ? Number(row.longitude) : null,
    category_hint: mapAcledEventTypeToCategory(row.event_type, row.sub_event_type),
    severity_hint: mapFatalitiesToSeverityHint(row.fatalities),
    source_confidence: 0.85,
    is_correction: 0,
    raw_payload: JSON.stringify(row)
  };
}

export function buildAcledUrl({ baseUrl = DEFAULT_BASE_URL, endpoint = DEFAULT_ENDPOINT, params = {} } = {}) {
  const url = new URL(endpoint, baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function parseCsvLikeEnvList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function buildDefaultAcledParams({
  limit = DEFAULT_LIMIT,
  page = 1,
  startTimestamp,
  endTimestamp,
  countries,
  eventTypes,
  fields = DEFAULT_FIELDS
} = {}) {
  const params = {
    _format: "json",
    limit,
    page
  };

  if (startTimestamp && endTimestamp) {
    params.timestamp = `${startTimestamp}..${endTimestamp}`;
  } else if (startTimestamp) {
    params.timestamp = startTimestamp;
    params.timestamp_where = ">=";
  } else if (endTimestamp) {
    params.timestamp = endTimestamp;
    params.timestamp_where = "<=";
  }

  if (Array.isArray(countries) && countries.length > 0) {
    params.country = countries.join("|");
  }

  if (Array.isArray(eventTypes) && eventTypes.length > 0) {
    params.event_type = eventTypes.join("|");
  }

  if (Array.isArray(fields) && fields.length > 0) {
    params.fields = fields.join("|");
  }

  return params;
}

export async function fetchAcledPage({
  token,
  baseUrl = DEFAULT_BASE_URL,
  endpoint = DEFAULT_ENDPOINT,
  params = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch
}) {
  if (!token) {
    throw new Error("ACLED token is required");
  }

  if (typeof fetchImpl !== "function") {
    throw new Error("No fetch implementation available");
  }

  const url = buildAcledUrl({ baseUrl, endpoint, params });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "LiveSignalsApp/1.0"
      },
      signal: controller.signal
    });

    const text = await response.text();
    let payload;

    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`ACLED returned non-JSON response (${response.status})`);
    }

    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        `ACLED request failed with status ${response.status}`;
      throw new Error(message);
    }

    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export function extractAcledRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export async function fetchAcledWindow({
  token,
  baseUrl = DEFAULT_BASE_URL,
  endpoint = DEFAULT_ENDPOINT,
  startTimestamp,
  endTimestamp,
  limit = DEFAULT_LIMIT,
  page = 1,
  countries,
  eventTypes,
  fields = DEFAULT_FIELDS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch
}) {
  const params = buildDefaultAcledParams({
    limit,
    page,
    startTimestamp,
    endTimestamp,
    countries,
    eventTypes,
    fields
  });

  const payload = await fetchAcledPage({
    token,
    baseUrl,
    endpoint,
    params,
    timeoutMs,
    fetchImpl
  });

  const observedAt = new Date().toISOString();
  const rows = extractAcledRows(payload);

  return {
    observed_at: observedAt,
    request: { baseUrl, endpoint, params },
    row_count: rows.length,
    raw_items: rows.map((row) => mapAcledRowToRawItem(row, { observedAt })),
    raw_response_meta: {
      status: payload?.status ?? null,
      count: payload?.count ?? null,
      last_update: payload?.["last update"] ?? payload?.last_update ?? null,
      page,
      limit
    }
  };
}

export async function fetchAcledPages({
  token,
  baseUrl = DEFAULT_BASE_URL,
  endpoint = DEFAULT_ENDPOINT,
  startTimestamp,
  endTimestamp,
  countries,
  eventTypes,
  fields = DEFAULT_FIELDS,
  limit = DEFAULT_LIMIT,
  maxPages = 1,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  sleepMs = 800
}) {
  const allRawItems = [];
  const pages = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const result = await fetchAcledWindow({
      token,
      baseUrl,
      endpoint,
      startTimestamp,
      endTimestamp,
      countries,
      eventTypes,
      fields,
      limit,
      page,
      timeoutMs,
      fetchImpl
    });

    allRawItems.push(...result.raw_items);
    pages.push({
      page,
      row_count: result.row_count,
      request: result.request,
      raw_response_meta: result.raw_response_meta
    });

    if (result.row_count < limit) break;
    if (page < maxPages) await sleep(sleepMs);
  }

  return {
    observed_at: new Date().toISOString(),
    page_count: pages.length,
    row_count: allRawItems.length,
    raw_items: allRawItems,
    pages
  };
}

export function buildAcledRuntimeConfig(env = process.env) {
  const now = new Date();
  const lookbackHours = Number(env.ACLED_LOOKBACK_HOURS || 168);
  const start = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);

  return {
    token: env.ACLED_TOKEN,
    baseUrl: env.ACLED_BASE_URL || DEFAULT_BASE_URL,
    endpoint: env.ACLED_ENDPOINT || DEFAULT_ENDPOINT,
    limit: Number(env.ACLED_LIMIT || DEFAULT_LIMIT),
    maxPages: Number(env.ACLED_MAX_PAGES || 1),
    startTimestamp: Math.floor(start.getTime() / 1000),
    endTimestamp: Math.floor(now.getTime() / 1000),
    countries: parseCsvLikeEnvList(env.ACLED_COUNTRIES),
    eventTypes: parseCsvLikeEnvList(env.ACLED_EVENT_TYPES)
  };
}
