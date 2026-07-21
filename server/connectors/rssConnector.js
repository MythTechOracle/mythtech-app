import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { sourceRegistry } from "../config/sources.js";
import { normalizeDomain } from "../db/db.js";

const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_MAX_ITEMS_PER_FEED = 15;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
  cdataPropName: "cdata"
});

function toBoolean(value, fallback = false) {
  if (value == null || value === "") {
    return fallback;
  }

  return String(value).toLowerCase() === "true";
}

function parsePositiveInteger(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(1, Math.floor(numeric));
}

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null) {
    return [];
  }

  return [value];
}

function stripMarkup(value) {
  if (value == null) {
    return null;
  }

  const text = String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

  return text || null;
}

function readText(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return stripMarkup(value);
  }

  if (typeof value === "object") {
    if (typeof value["#text"] === "string") {
      return stripMarkup(value["#text"]);
    }

    if (typeof value.cdata === "string") {
      return stripMarkup(value.cdata);
    }

    if (typeof value.href === "string") {
      return stripMarkup(value.href);
    }
  }

  return null;
}

function toIsoTimestamp(value) {
  const text = readText(value);
  if (!text) {
    return null;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function getLinkValue(link) {
  if (typeof link === "string") {
    return link.trim() || null;
  }

  if (Array.isArray(link)) {
    const preferred = link.find((item) => item?.rel === "alternate" && item?.href) || link.find((item) => item?.href);
    return getLinkValue(preferred || null);
  }

  if (link && typeof link === "object") {
    if (typeof link.href === "string") {
      return link.href.trim() || null;
    }

    if (typeof link["#text"] === "string") {
      return link["#text"].trim() || null;
    }
  }

  return null;
}

function getAtomEntries(payload) {
  return ensureArray(payload?.feed?.entry);
}

function getRssItems(payload) {
  return ensureArray(payload?.rss?.channel?.item);
}

function normalizeCategory(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) {
    return null;
  }

  if (["security", "diplomacy", "infrastructure", "policy", "information", "cyber"].includes(text)) {
    return text;
  }

  if (/(diplomac|foreign|ministry|ceasefire|talk|negotiat)/.test(text)) {
    return "diplomacy";
  }

  if (/(security|strike|missile|attack|military|naval|airspace|troop)/.test(text)) {
    return "security";
  }

  if (/(power|grid|rail|port|shipping|pipeline|airport|infrastructure|outage)/.test(text)) {
    return "infrastructure";
  }

  if (/(sanction|policy|regulation|export|treasury|compliance)/.test(text)) {
    return "policy";
  }

  if (/(cyber|network|malware|advisory)/.test(text)) {
    return "cyber";
  }

  return "information";
}

function inferCategory(feedConfig, entry) {
  const configured = normalizeCategory(feedConfig.category || feedConfig.query_basket);
  if (configured) {
    return configured;
  }

  const categoryValues = [
    ...ensureArray(entry.category),
    ...ensureArray(entry.tags)
  ]
    .map((value) => {
      if (value && typeof value === "object") {
        return value.term || value.label || value.name || value["#text"] || null;
      }

      return value;
    })
    .filter(Boolean);

  for (const value of categoryValues) {
    const normalized = normalizeCategory(value);
    if (normalized) {
      return normalized;
    }
  }

  const title = readText(entry.title) || "";
  const summary = readText(entry.description) || readText(entry.summary) || readText(entry.content) || "";
  return normalizeCategory(`${title} ${summary}`) || "information";
}

function inferCorrectionFlag(entry) {
  const title = readText(entry.title) || "";
  const summary = readText(entry.description) || readText(entry.summary) || "";
  return /(correction|corrected|update|clarification|retraction|retracted)/i.test(`${title} ${summary}`) ? 1 : 0;
}

function buildExternalId(feedConfig, entry) {
  const guid = readText(entry.guid) || readText(entry.id);
  const link = getLinkValue(entry.link);
  const publishedAt = toIsoTimestamp(entry.pubDate) || toIsoTimestamp(entry.published) || toIsoTimestamp(entry.updated);
  const title = readText(entry.title) || "untitled";

  if (guid) {
    return `${feedConfig.name}:${guid}`;
  }

  if (link) {
    return `${feedConfig.name}:${link}`;
  }

  const digest = createHash("sha1")
    .update(JSON.stringify({ title, publishedAt, feed: feedConfig.name }))
    .digest("hex");
  return `${feedConfig.name}:${digest}`;
}

function mapEntryToRawItem(entry, feedConfig, observedAt) {
  const source = sourceRegistry.rss;
  const publishedAt =
    toIsoTimestamp(entry.pubDate) ||
    toIsoTimestamp(entry.published) ||
    toIsoTimestamp(entry.updated) ||
    observedAt;
  const category = inferCategory(feedConfig, entry);

  return {
    domain: normalizeDomain(feedConfig.domain || "signals"),
    source_name: feedConfig.name,
    source_type: "rss",
    query_basket: feedConfig.query_basket || category,
    external_id: buildExternalId(feedConfig, entry),
    observed_at: observedAt,
    published_at: publishedAt,
    title: readText(entry.title) || "RSS item",
    summary:
      readText(entry.description) ||
      readText(entry.summary) ||
      readText(entry.content) ||
      readText(entry["content:encoded"]) ||
      null,
    url: getLinkValue(entry.link),
    region: feedConfig.region || "Unknown",
    country: feedConfig.country || null,
    lat: null,
    lon: null,
    category_hint: category,
    severity_hint: null,
    source_confidence: Number(feedConfig.confidence ?? source.confidence),
    is_correction: inferCorrectionFlag(entry),
    raw_payload: JSON.stringify({
      feed: {
        name: feedConfig.name,
        url: feedConfig.url,
        category: feedConfig.category || null
      },
      entry
    })
  };
}

function parseFeedsJson(rawValue) {
  if (!rawValue) {
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(rawValue);
  } catch (error) {
    throw new Error(`RSS_FEEDS_JSON is not valid JSON: ${error.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("RSS_FEEDS_JSON must be a JSON array");
  }

  return parsed
    .map((feed) => ({
      name: String(feed?.name || "").trim(),
      url: String(feed?.url || "").trim(),
      domain: normalizeDomain(feed?.domain || "signals"),
      category: feed?.category || feed?.query_basket || null,
      query_basket: feed?.query_basket || null,
      region: feed?.region || null,
      country: feed?.country || null,
      confidence: feed?.confidence
    }))
    .filter((feed) => feed.name && feed.url);
}

export function buildRssRuntimeConfig(env = process.env) {
  return {
    enabled: toBoolean(env.RSS_ENABLED, false),
    requestTimeoutMs: parsePositiveInteger(env.RSS_REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS),
    maxItemsPerFeed: parsePositiveInteger(env.RSS_MAX_ITEMS_PER_FEED, DEFAULT_MAX_ITEMS_PER_FEED),
    feeds: parseFeedsJson(env.RSS_FEEDS_JSON || "[]")
  };
}

export function isRssEnabled(env = process.env) {
  return buildRssRuntimeConfig(env).enabled;
}

async function fetchFeedXml(feedConfig, config, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") {
    throw new Error("No fetch implementation available");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetchImpl(feedConfig.url, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "User-Agent": "LiveSignalsApp/1.0"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`request timed out after ${config.requestTimeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseFeedEntries(xml) {
  const payload = parser.parse(xml);
  const entries = getRssItems(payload);
  if (entries.length > 0) {
    return entries;
  }

  return getAtomEntries(payload);
}

export async function fetchRssWindow(config = buildRssRuntimeConfig(process.env), fetchImpl = globalThis.fetch) {
  if (!config.enabled) {
    return {
      observed_at: new Date().toISOString(),
      items: [],
      feed_results: [],
      errors: [],
      skipped: true,
      reason: "disabled"
    };
  }

  if (config.feeds.length === 0) {
    return {
      observed_at: new Date().toISOString(),
      items: [],
      feed_results: [],
      errors: [{ feed: "rss", error: "RSS_ENABLED=true but RSS_FEEDS_JSON is empty" }],
      skipped: true,
      reason: "no_feeds"
    };
  }

  const observedAt = new Date().toISOString();
  const items = [];
  const feedResults = [];
  const errors = [];

  for (const feedConfig of config.feeds) {
    try {
      const xml = await fetchFeedXml(feedConfig, config, fetchImpl);
      const entries = parseFeedEntries(xml).slice(0, config.maxItemsPerFeed);
      const mappedItems = entries.map((entry) => mapEntryToRawItem(entry, feedConfig, observedAt));
      items.push(...mappedItems);
      feedResults.push({
        name: feedConfig.name,
        url: feedConfig.url,
        domain: feedConfig.domain,
        fetched: entries.length,
        inserted_candidates: mappedItems.length,
        category: feedConfig.category || null
      });
    } catch (error) {
      errors.push({
        feed: feedConfig.name,
        url: feedConfig.url,
        error: String(error?.message || error)
      });
      feedResults.push({
        name: feedConfig.name,
        url: feedConfig.url,
        domain: feedConfig.domain,
        fetched: 0,
        inserted_candidates: 0,
        category: feedConfig.category || null,
        error: String(error?.message || error)
      });
    }
  }

  return {
    observed_at: observedAt,
    items,
    feed_results: feedResults,
    errors,
    skipped: false,
    reason: null
  };
}
