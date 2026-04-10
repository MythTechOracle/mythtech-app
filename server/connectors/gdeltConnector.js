import { queryBaskets } from "../config/sources.js";
import { sourceRegistry } from "../config/sources.js";

const DEFAULT_DOC_API_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";
const DEFAULT_MODE = "artlist";
const DEFAULT_MAX_RECORDS = 15;
const DEFAULT_RETRY_MAX_RECORDS = 10;
const DEFAULT_TIMESPAN = "1day";
const DEFAULT_RETRY_TIMESPAN = "1h";
const DEFAULT_BASKETS_PER_CYCLE = 1;
const DEFAULT_BASKET_DELAY_MS = 3000;
const DEFAULT_RETRY_MAX = 2;
const DEFAULT_RETRY_BASE_MS = 5000;
const DEFAULT_RETRY_MAX_MS = 60000;
const DEFAULT_RETRY_JITTER_MS = 750;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 15 * 60 * 1000;
const DEFAULT_REQUEST_TIMEOUT_MS = 25000;

const gdeltRateLimitState = {
  cooldown_until_ms: 0,
  last_rate_limited_at: null
};

let gdeltBasketStartIndex = 0;

function toDocQuery(terms = []) {
  const quoted = terms.map((term) => `\"${term}\"`);
  return `(${quoted.join(" OR ")})`;
}

function parsePositiveInteger(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.floor(numeric));
}

function getGdeltConfig(env = process.env) {
  return {
    baseUrl: env.GDELT_DOC_API_BASE || DEFAULT_DOC_API_BASE,
    mode: env.GDELT_MODE || DEFAULT_MODE,
    maxRecords: parsePositiveInteger(env.GDELT_MAX_RECORDS, DEFAULT_MAX_RECORDS),
    retryMaxRecords: parsePositiveInteger(env.GDELT_RETRY_MAX_RECORDS, DEFAULT_RETRY_MAX_RECORDS),
    timespan: env.GDELT_TIMESPAN || DEFAULT_TIMESPAN,
    retryTimespan: env.GDELT_RETRY_TIMESPAN || DEFAULT_RETRY_TIMESPAN,
    basketsPerCycle: Math.max(
      1,
      parsePositiveInteger(env.GDELT_BASKETS_PER_CYCLE, DEFAULT_BASKETS_PER_CYCLE)
    ),
    basketDelayMs: parsePositiveInteger(env.GDELT_BASKET_DELAY_MS, DEFAULT_BASKET_DELAY_MS),
    retryMax: Math.max(1, parsePositiveInteger(env.GDELT_RETRY_MAX, DEFAULT_RETRY_MAX)),
    retryBaseMs: parsePositiveInteger(env.GDELT_RETRY_BASE_MS, DEFAULT_RETRY_BASE_MS),
    retryMaxMs: parsePositiveInteger(env.GDELT_RETRY_MAX_MS, DEFAULT_RETRY_MAX_MS),
    retryJitterMs: parsePositiveInteger(env.GDELT_RETRY_JITTER_MS, DEFAULT_RETRY_JITTER_MS),
    rateLimitCooldownMs: parsePositiveInteger(
      env.GDELT_RATE_LIMIT_COOLDOWN_MS,
      DEFAULT_RATE_LIMIT_COOLDOWN_MS
    ),
    requestTimeoutMs: parsePositiveInteger(env.GDELT_REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS)
  };
}

function getAttemptMaxRecords(config, attempt) {
  if (attempt <= 1) {
    return config.maxRecords;
  }

  return Math.min(config.maxRecords, Math.max(5, config.retryMaxRecords));
}

function getAttemptTimespan(config, attempt) {
  if (attempt <= 1) {
    return config.timespan;
  }

  return config.retryTimespan || config.timespan;
}

function buildGdeltUrl({ basket, config, maxRecords, timespan }) {
  const terms = queryBaskets[basket] || queryBaskets.security;
  const params = new URLSearchParams({
    query: toDocQuery(terms),
    mode: config.mode,
    format: "json",
    maxrecords: String(maxRecords),
    timespan,
    sort: "datedesc"
  });

  return `${config.baseUrl}?${params.toString()}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterMs(response) {
  const raw = response.headers.get("retry-after");
  if (!raw) {
    return null;
  }

  const seconds = Number(raw);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const retryAt = Date.parse(raw);
  if (Number.isNaN(retryAt)) {
    return null;
  }

  return Math.max(0, retryAt - Date.now());
}

function computeRetryDelayMs(response, attempt, config) {
  const retryAfterMs = response ? getRetryAfterMs(response) : null;
  if (retryAfterMs != null) {
    return retryAfterMs;
  }

  const exponentialDelayMs = Math.min(
    config.retryBaseMs * (2 ** Math.max(0, attempt - 1)),
    config.retryMaxMs
  );
  const jitterMs = Math.floor(Math.random() * (config.retryJitterMs + 1));
  return exponentialDelayMs + jitterMs;
}

function getCooldownInfo(nowMs = Date.now()) {
  const remainingMs = gdeltRateLimitState.cooldown_until_ms - nowMs;
  if (remainingMs <= 0) {
    return {
      active: false,
      until_iso: null,
      remaining_ms: 0,
      last_rate_limited_at: gdeltRateLimitState.last_rate_limited_at
    };
  }

  return {
    active: true,
    until_iso: new Date(gdeltRateLimitState.cooldown_until_ms).toISOString(),
    remaining_ms: remainingMs,
    last_rate_limited_at: gdeltRateLimitState.last_rate_limited_at
  };
}

function activateCooldown(delayMs, config) {
  const cooldownMs = Math.max(delayMs, config.rateLimitCooldownMs);
  gdeltRateLimitState.cooldown_until_ms = Date.now() + cooldownMs;
  gdeltRateLimitState.last_rate_limited_at = new Date().toISOString();
  return getCooldownInfo();
}

function rotateBaskets(basketNames) {
  if (basketNames.length <= 1) {
    return basketNames;
  }

  const startIndex = gdeltBasketStartIndex % basketNames.length;
  return [
    ...basketNames.slice(startIndex),
    ...basketNames.slice(0, startIndex)
  ];
}

function setNextBasketStart(nextBasket, basketNames) {
  const index = basketNames.indexOf(nextBasket);
  if (index >= 0) {
    gdeltBasketStartIndex = index;
  }
}

function selectBasketsForCycle(orderedBaskets, config) {
  return orderedBaskets.slice(0, Math.min(config.basketsPerCycle, orderedBaskets.length));
}

function getNextBasketInRotation(currentBasket, orderedBaskets) {
  const index = orderedBaskets.indexOf(currentBasket);
  if (index < 0) {
    return orderedBaskets[0] || null;
  }

  return orderedBaskets[(index + 1) % orderedBaskets.length] || currentBasket;
}

class GdeltRateLimitError extends Error {
  constructor({ basket, attempt, retryDelayMs, cooldownInfo }) {
    const detail = cooldownInfo?.until_iso
      ? `cooldown until ${cooldownInfo.until_iso}`
      : "cooldown active";
    super(
      `GDELT rate limited for ${basket}: HTTP 429 after attempt ${attempt}; retry delay ${retryDelayMs}ms; ${detail}`
    );
    this.name = "GdeltRateLimitError";
    this.basket = basket;
    this.attempt = attempt;
    this.retry_delay_ms = retryDelayMs;
    this.cooldown_until = cooldownInfo?.until_iso || null;
  }
}

async function fetchGdeltResponse(url, config) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    return await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "LiveSignalsApp/1.0"
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeFetchErrorMessage(error, config) {
  if (error?.name === "AbortError") {
    return `GDELT request timed out after ${config.requestTimeoutMs}ms`;
  }

  return String(error?.message || error);
}

function isRetriableFetchError(error) {
  return error?.name === "AbortError" || error?.name === "TypeError";
}

function normalizeDocItem(item, basket, index) {
  const source = sourceRegistry.gdelt;
  const publishedAt = toIsoTimestamp(item.seendate) || toIsoTimestamp(item.date) || null;
  return {
    source_name: source.name,
    source_type: "gdelt",
    query_basket: basket,
    external_id: item.url || item.seendate || `${basket}-${index}`,
    observed_at: new Date().toISOString(),
    published_at: publishedAt,
    title: item.title || null,
    summary: item.snippet || item.summary || item.domain || null,
    url: item.url || null,
    region: item.sourcecountry || item.location || null,
    country: item.sourcecountry || null,
    lat: null,
    lon: null,
    category_hint: basket,
    severity_hint: null,
    source_confidence: source.confidence,
    is_correction: 0,
    raw_payload: JSON.stringify(item)
  };
}

function toIsoTimestamp(value) {
  if (!value) {
    return null;
  }

  if (/^\d{8}T\d{6}Z$/.test(value)) {
    const year = value.slice(0, 4);
    const month = value.slice(4, 6);
    const day = value.slice(6, 8);
    const hour = value.slice(9, 11);
    const minute = value.slice(11, 13);
    const second = value.slice(13, 15);
    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export async function fetchGdeltBasket(basket, config = getGdeltConfig()) {
  const activeCooldown = getCooldownInfo();
  if (activeCooldown.active) {
    throw new GdeltRateLimitError({
      basket,
      attempt: 0,
      retryDelayMs: activeCooldown.remaining_ms,
      cooldownInfo: activeCooldown
    });
  }

  let lastError;

  for (let attempt = 1; attempt <= config.retryMax; attempt += 1) {
    const url = buildGdeltUrl({
      basket,
      config,
      maxRecords: getAttemptMaxRecords(config, attempt),
      timespan: getAttemptTimespan(config, attempt)
    });
    let response;

    try {
      response = await fetchGdeltResponse(url, config);
    } catch (error) {
      lastError = new Error(`GDELT request failed for ${basket}: ${normalizeFetchErrorMessage(error, config)}`);
      if (!isRetriableFetchError(error) || attempt >= config.retryMax) {
        throw lastError;
      }

      await sleep(computeRetryDelayMs(null, attempt, config));
      continue;
    }

    if (response.ok) {
      const payload = await response.json();
      const rows = payload?.articles || payload?.matches || [];
      return rows.map((item, index) => normalizeDocItem(item, basket, index));
    }

    if (response.status !== 429) {
      throw new Error(`GDELT fetch failed for ${basket}: HTTP ${response.status}`);
    }

    const retryDelayMs = computeRetryDelayMs(response, attempt, config);
    if (attempt >= config.retryMax) {
      const cooldownInfo = activateCooldown(retryDelayMs, config);
      throw new GdeltRateLimitError({
        basket,
        attempt,
        retryDelayMs,
        cooldownInfo
      });
    }

    lastError = new Error(`GDELT fetch failed for ${basket}: HTTP ${response.status}`);
    await sleep(retryDelayMs);
  }

  throw lastError;
}

function formatCooldownMessage(cooldownInfo) {
  if (!cooldownInfo?.until_iso) {
    return "GDELT cooldown active";
  }

  return `GDELT cooldown active until ${cooldownInfo.until_iso}`;
}

export function getGdeltCooldownStatus() {
  return getCooldownInfo();
}

export async function fetchGdeltWindow() {
  const config = getGdeltConfig();
  const cooldownInfo = getCooldownInfo();
  const basketNames = String(process.env.GDELT_BASKETS || "security,diplomacy,infrastructure")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const orderedBaskets = rotateBaskets(basketNames);
  const selectedBaskets = selectBasketsForCycle(orderedBaskets, config);

  if (cooldownInfo.active) {
    return {
      items: [],
      errors: [{ basket: "gdelt", error: formatCooldownMessage(cooldownInfo) }],
      skipped: true,
      rate_limited: true,
      cooldown_until: cooldownInfo.until_iso,
      basket_order: orderedBaskets,
      selected_baskets: selectedBaskets,
      baskets_per_cycle: config.basketsPerCycle,
      next_basket: selectedBaskets[0] || orderedBaskets[0] || null
    };
  }

  const items = [];
  const errors = [];
  let skipped = false;
  let rateLimited = false;
  let cooldownUntil = null;
  let nextBasket = selectedBaskets[0] || orderedBaskets[0] || null;

  for (let index = 0; index < selectedBaskets.length; index += 1) {
    const basket = selectedBaskets[index];

    try {
      items.push(...(await fetchGdeltBasket(basket, config)));
      nextBasket = getNextBasketInRotation(basket, orderedBaskets);
    } catch (error) {
      errors.push({ basket, error: String(error?.message || error) });
      nextBasket = getNextBasketInRotation(basket, orderedBaskets);

      if (error instanceof GdeltRateLimitError) {
        skipped = true;
        rateLimited = true;
        cooldownUntil = error.cooldown_until;
        nextBasket = basket;
        for (const remainingBasket of selectedBaskets.slice(index + 1)) {
          errors.push({
            basket: remainingBasket,
            error: `Skipped after GDELT rate limit; cooldown until ${cooldownUntil}`
          });
        }
        break;
      }
    }

    if (index < selectedBaskets.length - 1) {
      await sleep(config.basketDelayMs);
    }
  }

  if (nextBasket) {
    setNextBasketStart(nextBasket, basketNames);
  }

  return {
    items,
    errors,
    skipped,
    rate_limited: rateLimited,
    cooldown_until: cooldownUntil,
    basket_order: orderedBaskets,
    selected_baskets: selectedBaskets,
    baskets_per_cycle: config.basketsPerCycle,
    next_basket: nextBasket
  };
}
