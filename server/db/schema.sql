CREATE TABLE IF NOT EXISTS raw_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  query_basket TEXT,
  external_id TEXT,
  observed_at TEXT NOT NULL,
  published_at TEXT,
  title TEXT,
  summary TEXT,
  url TEXT,
  region TEXT,
  country TEXT,
  lat REAL,
  lon REAL,
  category_hint TEXT,
  severity_hint REAL,
  source_confidence REAL,
  is_correction INTEGER DEFAULT 0,
  raw_payload TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_unique
ON raw_items(source_type, external_id);

CREATE TABLE IF NOT EXISTS processed_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cluster_id TEXT NOT NULL,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  event_time TEXT NOT NULL,
  region TEXT NOT NULL,
  category TEXT NOT NULL,
  observed_update TEXT NOT NULL,
  severity TEXT NOT NULL,
  confidence REAL NOT NULL,
  source_count INTEGER NOT NULL,
  confirmation TEXT NOT NULL,
  correction TEXT NOT NULL,
  raw_item_ids TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_processed_window
ON processed_events(window_start, window_end);

CREATE TABLE IF NOT EXISTS metric_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  mode TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_window
ON metric_snapshots(window_start, window_end, generated_at);
