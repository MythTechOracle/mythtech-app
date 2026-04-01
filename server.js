import http from "node:http";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  getDashboardFixture,
  getExplainFixture,
  getHistoryFixture,
} from "./src/live-signals/fixtures.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT || 8787);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

async function sendFile(res, filePath) {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(body);
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
}

function getExplainPayload(key) {
  const explainMap = getExplainFixture("mock");
  return explainMap[key] || explainMap.signal_velocity;
}

function normalizeStaticPath(urlPathname) {
  const pathname = urlPathname === "/" ? "/index.html" : urlPathname;
  const safePath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.join(__dirname, safePath);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `localhost:${port}`}`);

  if (url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true, service: "live-signals-app" });
    return;
  }

  if (url.pathname === "/api/dashboard") {
    sendJson(res, 200, getDashboardFixture("mock"));
    return;
  }

  if (url.pathname === "/api/metrics/history") {
    sendJson(res, 200, getHistoryFixture("mock"));
    return;
  }

  if (url.pathname === "/api/composition") {
    const dashboard = getDashboardFixture("mock");
    sendJson(res, 200, { title: dashboard.composition.title, items: dashboard.composition.items });
    return;
  }

  if (url.pathname === "/api/events") {
    const dashboard = getDashboardFixture("mock");
    const category = url.searchParams.get("category");
    const items = category
      ? dashboard.recent_events.items.filter((item) => item.category === category)
      : dashboard.recent_events.items;
    sendJson(res, 200, { title: dashboard.recent_events.title, items });
    return;
  }

  if (url.pathname.startsWith("/api/explain/metric/")) {
    const key = url.pathname.split("/").pop();
    sendJson(res, 200, getExplainPayload(key));
    return;
  }

  const filePath = normalizeStaticPath(url.pathname);
  await sendFile(res, filePath);
});

server.listen(port, () => {
  const dashboard = getDashboardFixture("mock");
  console.log(
    JSON.stringify(
      {
        message: "Live Signals app ready",
        port,
        window: dashboard.meta.window.label,
        generated_at: dashboard.meta.generated_at,
      },
      null,
      2
    )
  );
});
