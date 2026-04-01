import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

let db;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureDb() {
  if (db) return db;

  const dbPath = path.resolve(process.cwd(), process.env.DB_PATH || "./data/live-signals.sqlite");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  return db;
}

export function initDb() {
  const instance = ensureDb();
  const schemaPath = path.resolve(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  instance.exec(schemaSql);
  return instance;
}

export function insertRawItems(items = []) {
  const instance = ensureDb();
  const insert = instance.prepare(`
    INSERT OR IGNORE INTO raw_items (
      source_name, source_type, query_basket, external_id, observed_at, published_at,
      title, summary, url, region, country, lat, lon, category_hint, severity_hint,
      source_confidence, is_correction, raw_payload
    ) VALUES (
      @source_name, @source_type, @query_basket, @external_id, @observed_at, @published_at,
      @title, @summary, @url, @region, @country, @lat, @lon, @category_hint, @severity_hint,
      @source_confidence, @is_correction, @raw_payload
    )
  `);

  const tx = instance.transaction((rows) => {
    let inserted = 0;
    for (const row of rows) {
      const info = insert.run(row);
      inserted += Number(info.changes || 0);
    }
    return inserted;
  });

  return tx(items);
}

export function loadRawItemsForWindow(windowStart, windowEnd) {
  const instance = ensureDb();
  return instance.prepare(`
    SELECT *
    FROM raw_items
    WHERE COALESCE(published_at, observed_at) BETWEEN ? AND ?
    ORDER BY COALESCE(published_at, observed_at) DESC
  `).all(windowStart, windowEnd);
}

export function clearProcessedEventsForWindow(windowStart, windowEnd) {
  const instance = ensureDb();
  instance.prepare(`
    DELETE FROM processed_events
    WHERE window_start = ? AND window_end = ?
  `).run(windowStart, windowEnd);
}

export function saveProcessedEvents(events, windowStart, windowEnd) {
  const instance = ensureDb();
  clearProcessedEventsForWindow(windowStart, windowEnd);

  const insert = instance.prepare(`
    INSERT INTO processed_events (
      cluster_id, window_start, window_end, event_time, region, category,
      observed_update, severity, confidence, source_count, confirmation,
      correction, raw_item_ids
    ) VALUES (
      @cluster_id, @window_start, @window_end, @event_time, @region, @category,
      @observed_update, @severity, @confidence, @source_count, @confirmation,
      @correction, @raw_item_ids
    )
  `);

  const tx = instance.transaction((rows) => {
    for (const row of rows) insert.run({ ...row, window_start: windowStart, window_end: windowEnd });
  });

  tx(events);
  return events.length;
}

export function saveMetricSnapshot({ windowStart, windowEnd, mode, payload }) {
  const instance = ensureDb();
  return instance.prepare(`
    INSERT INTO metric_snapshots (window_start, window_end, generated_at, mode, payload_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(windowStart, windowEnd, new Date().toISOString(), mode, JSON.stringify(payload));
}

export function getLatestSnapshot() {
  const instance = ensureDb();
  return instance.prepare(`
    SELECT *
    FROM metric_snapshots
    ORDER BY datetime(generated_at) DESC
    LIMIT 1
  `).get();
}

export function getLatestSnapshotByMode(mode) {
  const instance = ensureDb();
  return instance.prepare(`
    SELECT *
    FROM metric_snapshots
    WHERE mode = ?
    ORDER BY datetime(generated_at) DESC
    LIMIT 1
  `).get(mode);
}

export function getLatestLiveSnapshot() {
  return getLatestSnapshotByMode("live_api");
}

export function getLatestSnapshotSelection({ liveMaxAgeMs = 15 * 60 * 1000 } = {}) {
  const latestSnapshot = getLatestSnapshot();
  const latestLiveSnapshot = getLatestLiveSnapshot();
  const latestLiveGeneratedAt = new Date(latestLiveSnapshot?.generated_at || "").getTime();
  const liveFresh =
    Boolean(latestLiveSnapshot) &&
    Number.isFinite(latestLiveGeneratedAt) &&
    Date.now() - latestLiveGeneratedAt <= liveMaxAgeMs;
  const selectedSnapshot = liveFresh ? latestLiveSnapshot : latestSnapshot;

  return {
    selected_snapshot: selectedSnapshot || null,
    latest_snapshot: latestSnapshot || null,
    latest_live_snapshot: latestLiveSnapshot || null,
    selection_policy: liveFresh ? "prefer_fresh_live" : "fallback_to_latest_overall",
    live_max_age_ms: liveMaxAgeMs
  };
}

export function getLatestSnapshotBundle() {
  const row = getLatestSnapshot();
  if (!row) return null;
  return JSON.parse(row.payload_json);
}

export function getLatestLiveSnapshotBundle() {
  const row = getLatestLiveSnapshot();
  if (!row) return null;
  return JSON.parse(row.payload_json);
}
