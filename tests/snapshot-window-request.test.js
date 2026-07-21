import test from "node:test";
import assert from "node:assert/strict";

import {
  formatSnapshotWindowLabel,
  parseSnapshotRequest,
  parseSnapshotWindowHours
} from "../server/services/snapshotService.js";

test("parseSnapshotWindowHours accepts supported live and historical windows", () => {
  assert.equal(parseSnapshotWindowHours("6h"), 6);
  assert.equal(parseSnapshotWindowHours("24h"), 24);
  assert.equal(parseSnapshotWindowHours("72h"), 72);
  assert.equal(parseSnapshotWindowHours("7d"), 168);
});

test("parseSnapshotWindowHours falls back for unsupported windows", () => {
  assert.equal(parseSnapshotWindowHours("12h"), 6);
  assert.equal(parseSnapshotWindowHours("banana"), 6);
  assert.equal(parseSnapshotWindowHours(null, 24), 24);
});

test("parseSnapshotRequest separates selected snapshots from historical rebuilds", () => {
  assert.deepEqual(parseSnapshotRequest({ window: "6h" }), {
    window_hours: 6,
    window_label: "6h",
    request_mode: "selected_snapshot"
  });
  assert.deepEqual(parseSnapshotRequest({ window: "7d" }), {
    window_hours: 168,
    window_label: "7d",
    request_mode: "historical_rebuild"
  });
});

test("formatSnapshotWindowLabel keeps the seven-day display label", () => {
  assert.equal(formatSnapshotWindowLabel(24), "24h");
  assert.equal(formatSnapshotWindowLabel(72), "72h");
  assert.equal(formatSnapshotWindowLabel(168), "7d");
});
