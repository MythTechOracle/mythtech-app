import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const DEFAULT_BASE_URL = "http://localhost:8787";
const DEFAULT_DB_PATH = "./data/live-signals.sqlite";
const SNAPSHOT_LIVE_MAX_AGE_MS = 15 * 60 * 1000;

const TOOL_NAMES = {
  dashboard: "get_dashboard",
  mt07Envelope: "get_mt07_envelope",
  explainMetric: "get_explain_metric",
  healthReport: "get_health_report",
  snapshotSelection: "get_snapshot_selection",
  snapshotBundle: "get_snapshot_bundle",
  dbOverview: "get_db_overview"
};

const HEALTH_PATHS = new Map([
  ["health", "/api/health"],
  ["detail", "/api/health/detail"],
  ["cluster_quality", "/api/health/cluster-quality"],
  ["escalation_pressure", "/api/health/escalation-pressure"],
  ["acled_proof", "/api/health/acled-proof"],
  ["lane_compare", "/api/health/lane-compare"]
]);

function getBaseUrl(env = process.env) {
  return String(env.SIGNAL_APP_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function getDbPath(env = process.env) {
  return path.resolve(process.cwd(), env.DB_PATH || DEFAULT_DB_PATH);
}

function buildUrl(routePath, query = {}, env = process.env) {
  const url = new URL(routePath, `${getBaseUrl(env)}/`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

async function fetchJson(routePath, query = {}, env = process.env) {
  const url = buildUrl(routePath, query, env);
  const response = await fetch(url);
  const text = await response.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Keep the raw text if the endpoint did not return JSON.
  }
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return {
    route: url.toString(),
    status: response.status,
    data
  };
}

function withReadOnlyDb(callback, env = process.env) {
  const dbPath = getDbPath(env);
  if (!fs.existsSync(dbPath)) {
    return {
      db_path: dbPath,
      available: false,
      message: "SQLite database not found for read-only inspection."
    };
  }
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    return callback(db, dbPath);
  } finally {
    db.close();
  }
}

function selectLatestSnapshot(db, whereClause = "", params = []) {
  return db
    .prepare(`
      SELECT id, window_start, window_end, generated_at, mode, payload_json
      FROM metric_snapshots
      ${whereClause}
      ORDER BY datetime(generated_at) DESC
      LIMIT 1
    `)
    .get(...params);
}

export function getSnapshotSelection(env = process.env) {
  return withReadOnlyDb((db, dbPath) => {
    const latest = selectLatestSnapshot(db);
    const latestLive = selectLatestSnapshot(db, "WHERE mode = ?", ["live_api"]);
    const latestLiveGeneratedAt = new Date(latestLive?.generated_at || "").getTime();
    const liveFresh =
      Boolean(latestLive) &&
      Number.isFinite(latestLiveGeneratedAt) &&
      Date.now() - latestLiveGeneratedAt <= SNAPSHOT_LIVE_MAX_AGE_MS;
    const selected = liveFresh ? latestLive : latest;

    return {
      db_path: dbPath,
      available: true,
      live_max_age_ms: SNAPSHOT_LIVE_MAX_AGE_MS,
      selection_policy: liveFresh ? "prefer_fresh_live" : "fallback_to_latest_overall",
      selected_snapshot: selected
        ? {
            id: selected.id,
            mode: selected.mode,
            window_start: selected.window_start,
            window_end: selected.window_end,
            generated_at: selected.generated_at
          }
        : null,
      latest_snapshot: latest
        ? {
            id: latest.id,
            mode: latest.mode,
            window_start: latest.window_start,
            window_end: latest.window_end,
            generated_at: latest.generated_at
          }
        : null,
      latest_live_snapshot: latestLive
        ? {
            id: latestLive.id,
            mode: latestLive.mode,
            window_start: latestLive.window_start,
            window_end: latestLive.window_end,
            generated_at: latestLive.generated_at
          }
        : null
    };
  }, env);
}

export function getSnapshotBundle({ mode = "selected" } = {}, env = process.env) {
  return withReadOnlyDb((db, dbPath) => {
    const latest = selectLatestSnapshot(db);
    const latestLive = selectLatestSnapshot(db, "WHERE mode = ?", ["live_api"]);
    const latestLiveGeneratedAt = new Date(latestLive?.generated_at || "").getTime();
    const liveFresh =
      Boolean(latestLive) &&
      Number.isFinite(latestLiveGeneratedAt) &&
      Date.now() - latestLiveGeneratedAt <= SNAPSHOT_LIVE_MAX_AGE_MS;
    const selected = liveFresh ? latestLive : latest;

    const row =
      mode === "live"
        ? latestLive
        : mode === "latest"
          ? latest
          : selected;

    if (!row) {
      return {
        db_path: dbPath,
        available: true,
        mode,
        message: "No snapshot bundle is available yet.",
        bundle: null
      };
    }

    return {
      db_path: dbPath,
      available: true,
      mode,
      snapshot: {
        id: row.id,
        mode: row.mode,
        window_start: row.window_start,
        window_end: row.window_end,
        generated_at: row.generated_at
      },
      bundle: JSON.parse(row.payload_json)
    };
  }, env);
}

export function getDbOverview(env = process.env) {
  return withReadOnlyDb((db, dbPath) => {
    const rawCounts = db
      .prepare(`
        SELECT
          COUNT(*) AS raw_item_count,
          COUNT(DISTINCT source_name) AS source_name_count,
          COUNT(DISTINCT query_basket) AS basket_count
        FROM raw_items
      `)
      .get();
    const processedCounts = db
      .prepare(`
        SELECT
          COUNT(*) AS processed_event_count,
          COUNT(DISTINCT cluster_id) AS processed_cluster_count,
          MAX(window_end) AS latest_processed_window_end
        FROM processed_events
      `)
      .get();
    const snapshotCounts = db
      .prepare(`
        SELECT
          COUNT(*) AS snapshot_count,
          MAX(generated_at) AS latest_snapshot_generated_at
        FROM metric_snapshots
      `)
      .get();

    return {
      db_path: dbPath,
      available: true,
      raw_items: rawCounts,
      processed_events: processedCounts,
      metric_snapshots: snapshotCounts
    };
  }, env);
}

function makeTextResult(value) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

function parseArguments(rawArgs) {
  return rawArgs && typeof rawArgs === "object" ? rawArgs : {};
}

export async function handleToolCall(name, rawArgs, env = process.env) {
  const args = parseArguments(rawArgs);

  switch (name) {
    case TOOL_NAMES.dashboard:
      return makeTextResult(
        await fetchJson("/api/dashboard", { window: args.window || "6h" }, env)
      );

    case TOOL_NAMES.mt07Envelope:
      return makeTextResult(
        await fetchJson("/api/handoff/mt07-envelope", {}, env)
      );

    case TOOL_NAMES.explainMetric:
      if (!args.key) {
        throw new Error("get_explain_metric requires a metric key.");
      }
      return makeTextResult(
        await fetchJson(`/api/explain/metric/${encodeURIComponent(args.key)}`, { window: args.window || "6h" }, env)
      );

    case TOOL_NAMES.healthReport: {
      const report = String(args.report || "health");
      const routePath = HEALTH_PATHS.get(report);
      if (!routePath) {
        throw new Error(`Unsupported health report "${report}".`);
      }
      return makeTextResult(await fetchJson(routePath, args.query || {}, env));
    }

    case TOOL_NAMES.snapshotSelection:
      return makeTextResult(getSnapshotSelection(env));

    case TOOL_NAMES.snapshotBundle:
      return makeTextResult(
        getSnapshotBundle(
          {
            mode: args.mode || "selected"
          },
          env
        )
      );

    case TOOL_NAMES.dbOverview:
      return makeTextResult(getDbOverview(env));

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export function createSignalReadonlyServer(env = process.env) {
  const server = new Server(
    {
      name: "signal-app-readonly",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: TOOL_NAMES.dashboard,
        description: "Read the current dashboard bundle from the local Signal app API.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            window: {
              type: "string",
              description: "Window label such as 6h, 24h, or 72h."
            }
          }
        }
      },
      {
        name: TOOL_NAMES.mt07Envelope,
        description: "Read the draft MT-07 result-envelope sidecar from the local Signal app API.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {}
        }
      },
      {
        name: TOOL_NAMES.explainMetric,
        description: "Read one explain surface from the local Signal app API.",
        inputSchema: {
          type: "object",
          required: ["key"],
          additionalProperties: false,
          properties: {
            key: {
              type: "string",
              description: "Metric key such as signal_velocity, volatility_index, escalation_pressure, correction_rate, or tone_pressure."
            },
            window: {
              type: "string",
              description: "Window label such as 6h, 24h, or 72h."
            }
          }
        }
      },
      {
        name: TOOL_NAMES.healthReport,
        description: "Read one read-only health report from the local Signal app API.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            report: {
              type: "string",
              enum: Array.from(HEALTH_PATHS.keys()),
              description: "Health report to request."
            },
            query: {
              type: "object",
              description: "Optional query parameters passed through to the report."
            }
          }
        }
      },
      {
        name: TOOL_NAMES.snapshotSelection,
        description: "Read the current snapshot-selection state directly from the local SQLite database.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {}
        }
      },
      {
        name: TOOL_NAMES.snapshotBundle,
        description: "Read the latest selected, latest overall, or latest live snapshot bundle directly from the local SQLite database.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            mode: {
              type: "string",
              enum: ["selected", "latest", "live"],
              description: "Snapshot bundle mode to read."
            }
          }
        }
      },
      {
        name: TOOL_NAMES.dbOverview,
        description: "Read a narrow, read-only overview of raw items, processed events, and metric snapshots from the local SQLite database.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {}
        }
      }
    ]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      return await handleToolCall(request.params.name, request.params.arguments, env);
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : String(error)
              },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }
  });

  return server;
}

async function main() {
  const server = createSignalReadonlyServer(process.env);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
