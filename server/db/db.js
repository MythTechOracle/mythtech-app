import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

let db;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function normalizeDomain(value = "signals") {
  return String(value || "").trim().toLowerCase() === "uap" ? "uap" : "signals";
}

function ensureDb() {
  if (db) return db;

  const dbPath = path.resolve(process.cwd(), process.env.DB_PATH || "./data/live-signals.sqlite");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  return db;
}

function hasColumn(instance, tableName, columnName) {
  return instance.prepare(`PRAGMA table_info(${tableName})`).all()
    .some((column) => column.name === columnName);
}

function ensureColumn(instance, tableName, columnName, columnSql) {
  if (!hasColumn(instance, tableName, columnName)) {
    instance.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnSql}`);
  }
}

function applyDomainSchemaPatches(instance) {
  ensureColumn(instance, "raw_items", "domain", "TEXT NOT NULL DEFAULT 'signals'");
  ensureColumn(instance, "processed_events", "domain", "TEXT NOT NULL DEFAULT 'signals'");
  ensureColumn(instance, "metric_snapshots", "domain", "TEXT NOT NULL DEFAULT 'signals'");

  instance.exec("DROP INDEX IF EXISTS idx_raw_unique");
  instance.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_unique
    ON raw_items(domain, source_type, external_id)
  `);

  instance.exec("DROP INDEX IF EXISTS idx_processed_window");
  instance.exec(`
    CREATE INDEX IF NOT EXISTS idx_processed_window
    ON processed_events(domain, window_start, window_end)
  `);

  instance.exec("DROP INDEX IF EXISTS idx_snapshots_window");
  instance.exec(`
    CREATE INDEX IF NOT EXISTS idx_snapshots_window
    ON metric_snapshots(domain, window_start, window_end, generated_at)
  `);
}

export function initDb() {
  const instance = ensureDb();
  const schemaPath = path.resolve(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  instance.exec(schemaSql);
  applyDomainSchemaPatches(instance);
  return instance;
}

export function insertRawItems(items = []) {
  const instance = ensureDb();
  const insert = instance.prepare(`
    INSERT OR IGNORE INTO raw_items (
      domain, source_name, source_type, query_basket, external_id, observed_at, published_at,
      title, summary, url, region, country, lat, lon, category_hint, severity_hint,
      source_confidence, is_correction, raw_payload
    ) VALUES (
      @domain, @source_name, @source_type, @query_basket, @external_id, @observed_at, @published_at,
      @title, @summary, @url, @region, @country, @lat, @lon, @category_hint, @severity_hint,
      @source_confidence, @is_correction, @raw_payload
    )
  `);

  const tx = instance.transaction((rows) => {
    let inserted = 0;
    for (const row of rows) {
      const info = insert.run({
        ...row,
        domain: normalizeDomain(row.domain || "signals")
      });
      inserted += Number(info.changes || 0);
    }
    return inserted;
  });

  return tx(items);
}

export function loadRawItemsForWindow(windowStart, windowEnd, domain = "signals") {
  const instance = ensureDb();
  return instance.prepare(`
    SELECT *
    FROM raw_items
    WHERE domain = ?
      AND COALESCE(published_at, observed_at) BETWEEN ? AND ?
    ORDER BY COALESCE(published_at, observed_at) DESC
  `).all(normalizeDomain(domain), windowStart, windowEnd);
}

export function clearProcessedEventsForWindow(windowStart, windowEnd, domain = "signals") {
  const instance = ensureDb();
  instance.prepare(`
    DELETE FROM processed_events
    WHERE domain = ? AND window_start = ? AND window_end = ?
  `).run(normalizeDomain(domain), windowStart, windowEnd);
}

export function saveProcessedEvents(events, windowStart, windowEnd) {
  const instance = ensureDb();
  const domain = normalizeDomain(events[0]?.domain || "signals");
  clearProcessedEventsForWindow(windowStart, windowEnd, domain);

  const insert = instance.prepare(`
    INSERT INTO processed_events (
      domain, cluster_id, window_start, window_end, event_time, region, category,
      observed_update, severity, confidence, source_count, confirmation,
      correction, raw_item_ids
    ) VALUES (
      @domain, @cluster_id, @window_start, @window_end, @event_time, @region, @category,
      @observed_update, @severity, @confidence, @source_count, @confirmation,
      @correction, @raw_item_ids
    )
  `);

  const tx = instance.transaction((rows) => {
    for (const row of rows) {
      insert.run({
        ...row,
        domain,
        window_start: windowStart,
        window_end: windowEnd
      });
    }
  });

  tx(events);
  return events.length;
}

export function saveMetricSnapshot({ domain = "signals", windowStart, windowEnd, mode, payload }) {
  const instance = ensureDb();
  return instance.prepare(`
    INSERT INTO metric_snapshots (domain, window_start, window_end, generated_at, mode, payload_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    normalizeDomain(domain || payload?.dashboard?.meta?.domain || "signals"),
    windowStart,
    windowEnd,
    new Date().toISOString(),
    mode,
    JSON.stringify(payload)
  );
}

export function getLatestSnapshot(domain = "signals") {
  const instance = ensureDb();
  return instance.prepare(`
    SELECT *
    FROM metric_snapshots
    WHERE domain = ?
    ORDER BY datetime(generated_at) DESC
    LIMIT 1
  `).get(normalizeDomain(domain));
}

export function getLatestSnapshotByMode(mode, domain = "signals") {
  const instance = ensureDb();
  return instance.prepare(`
    SELECT *
    FROM metric_snapshots
    WHERE domain = ? AND mode = ?
    ORDER BY datetime(generated_at) DESC
    LIMIT 1
  `).get(normalizeDomain(domain), mode);
}

export function getLatestLiveSnapshot(domain = "signals") {
  return getLatestSnapshotByMode("live_api", domain);
}

export function getLatestSnapshotSelection({ liveMaxAgeMs = 15 * 60 * 1000, domain = "signals" } = {}) {
  const scopedDomain = normalizeDomain(domain);
  const latestSnapshot = getLatestSnapshot(scopedDomain);
  const latestLiveSnapshot = getLatestLiveSnapshot(scopedDomain);
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
    domain: scopedDomain,
    selection_policy: liveFresh ? "prefer_fresh_live" : "fallback_to_latest_overall",
    live_max_age_ms: liveMaxAgeMs
  };
}

export function getLatestSnapshotBundle(domain = "signals") {
  const row = getLatestSnapshot(domain);
  if (!row) return null;
  return JSON.parse(row.payload_json);
}

export function getLatestLiveSnapshotBundle(domain = "signals") {
  const row = getLatestLiveSnapshot(domain);
  if (!row) return null;
  return JSON.parse(row.payload_json);
}
