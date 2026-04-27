import { Router } from "express";
import { getSnapshotBundle, buildSnapshot } from "../services/snapshotService.js";
import { enrichDriverRowsWithTranslation } from "../services/translationService.js";
import {
  buildEscalationPressureAudit,
  buildEscalationTemporalRead
} from "../services/escalationPressureService.js";

const router = Router();

router.get("/:key", async (req, res, next) => {
  try {
    const bundle = getSnapshotBundle() || (await buildSnapshot(6));
    const key = req.params.key;
    const baseExplain = bundle.explain?.[key] || null;

    if (!baseExplain) {
      res.status(404).json({ error: "Metric explanation unavailable" });
      return;
    }

    const windowQuery = String(req.query.window || req.query.hours || req.query.window_hours || "6");
    const windowHours = Number(windowQuery.replace(/h$/i, "")) || 6;
    let explain = baseExplain;

    if (key === "escalation_pressure") {
      const audit = await buildEscalationPressureAudit(windowHours);
      const temporalRead = await buildEscalationTemporalRead({ [windowHours]: audit });
      const { summary_temporal, ...temporalBlock } = temporalRead;
      explain = {
        ...baseExplain,
        window: `${windowHours}h`,
        value: audit.current_value,
        inputs: {
          contributing_cluster_count: audit.escalation_contributor_count,
          visible_contributor_count: audit.visible_escalation_contributor_count,
          suppressed_contributor_count: audit.suppressed_escalation_contributor_count
        },
        drivers: audit.top_explain_drivers,
        temporal_read: temporalBlock,
        summary_temporal,
        operator_audit: {
          current_value: audit.current_value,
          current_display: audit.current_display,
          current_status: audit.current_status,
          visible_sample_state: audit.visible_sample_state,
          visible_escalation_contributor_count: audit.visible_escalation_contributor_count,
          suppressed_escalation_contributor_count: audit.suppressed_escalation_contributor_count,
          top_contributing_clusters: audit.top_contributing_clusters,
          top_explain_drivers: audit.top_explain_drivers,
          strain_without_hardening_example: audit.strain_without_hardening_example,
          hardening_without_infrastructure_dominance_example:
            audit.hardening_without_infrastructure_dominance_example
        }
      };
    }

    if (key === "source_diversity" && Array.isArray(explain.drivers) && explain.drivers.length) {
      explain = {
        ...explain,
        drivers: await enrichDriverRowsWithTranslation(explain.drivers, "sample_update"),
      };
    }

    res.json(explain);
  } catch (error) {
    next(error);
  }
});

export default router;
