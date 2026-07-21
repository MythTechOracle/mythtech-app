import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBasketRecallFromRows,
  normalizeRecallDomainScope,
  parseRecallWindowHours
} from "../server/services/basketRecallService.js";

test("normalizeRecallDomainScope allows signals, uap, and all", () => {
  assert.equal(normalizeRecallDomainScope("signals"), "signals");
  assert.equal(normalizeRecallDomainScope("uap"), "uap");
  assert.equal(normalizeRecallDomainScope("all"), "all");
  assert.equal(normalizeRecallDomainScope("*"), "all");
  assert.equal(normalizeRecallDomainScope("unknown"), "signals");
});

test("parseRecallWindowHours defaults to 24h and supports wider recall windows", () => {
  assert.equal(parseRecallWindowHours(undefined), 24);
  assert.equal(parseRecallWindowHours("72h"), 72);
  assert.equal(parseRecallWindowHours("7d"), 168);
});

test("buildBasketRecallFromRows groups raw intake by domain and basket", () => {
  const payload = buildBasketRecallFromRows({
    rows: [
      {
        domain: "signals",
        source_name: "Source A",
        source_type: "gdelt",
        query_basket: "infrastructure",
        external_id: "a",
        title: "Power outage affects rail station",
        category_hint: "infrastructure",
        published_at: "2026-07-20T01:00:00Z",
        observed_at: "2026-07-20T01:05:00Z"
      },
      {
        domain: "signals",
        source_name: "Source B",
        source_type: "rss",
        query_basket: "infrastructure",
        external_id: "b",
        title: "Utility repairs continue",
        category_hint: "infrastructure",
        published_at: "2026-07-20T02:00:00Z",
        observed_at: "2026-07-20T02:05:00Z"
      },
      {
        domain: "uap",
        source_name: "Source C",
        source_type: "gdelt",
        query_basket: "disclosure",
        external_id: "c",
        title: "Hearing coverage continues",
        category_hint: "policy",
        published_at: "2026-07-20T03:00:00Z",
        observed_at: "2026-07-20T03:05:00Z"
      }
    ],
    windowHours: 72,
    windowStart: "2026-07-17T00:00:00Z",
    windowEnd: "2026-07-20T00:00:00Z",
    domainScope: "all",
    sampleLimit: 1
  });

  assert.equal(payload.authority, "raw_intake_recall_only");
  assert.equal(payload.window, "72h");
  assert.equal(payload.summary.raw_item_count, 3);
  assert.equal(payload.summary.basket_count, 2);
  assert.equal(payload.domains.length, 2);

  const signalsDomain = payload.domains.find((entry) => entry.domain === "signals");
  assert.equal(signalsDomain.raw_item_count, 2);
  assert.equal(signalsDomain.baskets[0].basket, "infrastructure");
  assert.equal(signalsDomain.baskets[0].raw_item_count, 2);
  assert.equal(signalsDomain.baskets[0].sample_items.length, 1);
});
