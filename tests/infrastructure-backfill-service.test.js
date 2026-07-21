import test from "node:test";
import assert from "node:assert/strict";

import { buildInfrastructureBackfillFromRows } from "../server/services/infrastructureBackfillService.js";

test("buildInfrastructureBackfillFromRows returns a subordinate continuity lane", () => {
  const payload = buildInfrastructureBackfillFromRows({
    rows: [
      {
        domain: "signals",
        source_name: "Grid Desk",
        source_type: "rss",
        query_basket: "infrastructure",
        category_hint: "infrastructure",
        external_id: "old-grid",
        title: "Power outage affects rail service after storm damage",
        published_at: "2026-07-19T08:00:00Z",
        observed_at: "2026-07-19T08:05:00Z",
        region: "South America",
        country: "VE"
      },
      {
        domain: "signals",
        source_name: "Airport Wire",
        source_type: "gdelt",
        query_basket: "security",
        category_hint: "security",
        external_id: "current-airport",
        title: "Airport terminal disruption reported after power outage",
        published_at: "2026-07-20T11:00:00Z",
        observed_at: "2026-07-20T11:05:00Z",
        region: "North America",
        country: "US"
      },
      {
        domain: "signals",
        source_name: "Security Wire",
        source_type: "gdelt",
        query_basket: "security",
        category_hint: "security",
        external_id: "security-only",
        title: "Diplomatic statement follows regional talks",
        published_at: "2026-07-20T10:00:00Z",
        observed_at: "2026-07-20T10:05:00Z",
        region: "Europe",
        country: "FR"
      }
    ],
    windowHours: 72,
    currentWindowHours: 6,
    windowStart: "2026-07-17T12:00:00Z",
    windowEnd: "2026-07-20T12:00:00Z",
    domainScope: "signals",
    sampleLimit: 5
  });

  assert.equal(payload.report, "infrastructure_watch_backfill");
  assert.equal(payload.authority, "continuity_backfill_only");
  assert.equal(payload.promotion_allowed, false);
  assert.equal(payload.state, "continuity_plus_current_overlap");
  assert.equal(payload.summary.candidate_count, 2);
  assert.equal(payload.summary.current_window_overlap_count, 1);
  assert.equal(payload.summary.continuity_backfill_count, 1);

  const domain = payload.domains[0];
  assert.equal(domain.domain, "signals");
  assert.equal(domain.candidate_count, 2);

  const infrastructureBasket = domain.baskets.find((basket) => basket.basket === "infrastructure");
  assert.equal(infrastructureBasket.continuity_backfill_count, 1);
  assert.equal(infrastructureBasket.sample_items[0].promotion_allowed, false);

  const securityBasket = domain.baskets.find((basket) => basket.basket === "security");
  assert.equal(securityBasket.current_window_overlap_count, 1);
});

test("buildInfrastructureBackfillFromRows reports no signal without inflating the lane", () => {
  const payload = buildInfrastructureBackfillFromRows({
    rows: [
      {
        domain: "signals",
        source_name: "General Wire",
        source_type: "gdelt",
        query_basket: "diplomacy",
        category_hint: "diplomacy",
        external_id: "talks",
        title: "Officials meet for regional talks",
        published_at: "2026-07-20T11:00:00Z",
        observed_at: "2026-07-20T11:05:00Z"
      }
    ],
    windowHours: 24,
    currentWindowHours: 6,
    windowStart: "2026-07-19T12:00:00Z",
    windowEnd: "2026-07-20T12:00:00Z"
  });

  assert.equal(payload.state, "no_infrastructure_watch_signal");
  assert.equal(payload.summary.candidate_count, 0);
  assert.deepEqual(payload.domains, []);
});
