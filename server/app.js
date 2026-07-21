import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import healthRouter from "./routes/health.js";
import healthDetailRouter from "./routes/healthDetail.js";
import clusterQualityRouter from "./routes/clusterQuality.js";
import escalationPressureRouter from "./routes/escalationPressure.js";
import acledProofRouter from "./routes/acledProof.js";
import laneCompareRouter from "./routes/laneCompare.js";
import basketRecallRouter from "./routes/basketRecall.js";
import infrastructureBackfillRouter from "./routes/infrastructureBackfill.js";
import dashboardRouter from "./routes/dashboard.js";
import historyRouter from "./routes/metricsHistory.js";
import compositionRouter from "./routes/composition.js";
import eventsRouter from "./routes/events.js";
import explainRouter from "./routes/explainMetric.js";
import mt07EnvelopeRouter from "./routes/mt07Envelope.js";
import mt07KernelSessionRouter from "./routes/mt07KernelSession.js";
import helperAuditRouter from "./routes/helper/audit.js";
import { initDb } from "./db/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultStaticRoot = path.resolve(__dirname, "..");

export function createServer() {
  initDb();

  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/health/detail", healthDetailRouter);
  app.use("/api/health/cluster-quality", clusterQualityRouter);
  app.use("/api/health/escalation-pressure", escalationPressureRouter);
  app.use("/api/health/acled-proof", acledProofRouter);
  app.use("/api/health/lane-compare", laneCompareRouter);
  app.use("/api/health/basket-recall", basketRecallRouter);
  app.use("/api/health/infrastructure-backfill", infrastructureBackfillRouter);
  app.use("/api/health", healthRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/handoff/mt07-envelope", mt07EnvelopeRouter);
  app.use("/api/handoff/mt07-kernel-session", mt07KernelSessionRouter);
  app.use("/api/helper/audit", helperAuditRouter);
  app.use("/api/metrics/history", historyRouter);
  app.use("/api/composition", compositionRouter);
  app.use("/api/events", eventsRouter);
  app.use("/api/explain/metric", explainRouter);

  const staticRoot = path.resolve(process.cwd(), process.env.STATIC_ROOT || defaultStaticRoot);
  app.use(express.static(staticRoot));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticRoot, "index.html"));
  });

  return app;
}
