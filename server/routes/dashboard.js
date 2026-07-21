import { Router } from "express";
import {
  getSnapshotBundleForRequest,
  getSnapshotSelection
} from "../services/snapshotService.js";
import { buildSignalCycle } from "../services/scoringService.js";
import { enrichEventItemsWithTranslation, enrichHeldOutItemsWithTranslation } from "../services/translationService.js";
import { getRefreshLoopStatus } from "../services/refreshLoopService.js";

const router = Router();

function applySnapshotSelectionMeta(dashboard, selection) {
  const next = structuredClone(dashboard);
  const selected = selection?.selected_snapshot || null;
  const latest = selection?.latest_snapshot || null;
  const latestLive = selection?.latest_live_snapshot || null;

  next.meta = next.meta || {};
  next.meta.generated_at = selected?.generated_at || next.meta.generated_at || null;
  next.meta.snapshot_selection = {
    selected_snapshot_id: selected?.id ?? null,
    selected_mode: selected?.mode ?? null,
    selected_generated_at: selected?.generated_at ?? null,
    selection_policy: selection?.selection_policy ?? null,
    live_max_age_ms: selection?.live_max_age_ms ?? null,
    latest_snapshot_id: latest?.id ?? null,
    latest_snapshot_mode: latest?.mode ?? null,
    latest_snapshot_generated_at: latest?.generated_at ?? null,
    latest_live_snapshot_id: latestLive?.id ?? null,
    latest_live_snapshot_mode: latestLive?.mode ?? null,
    latest_live_snapshot_generated_at: latestLive?.generated_at ?? null
  };

  return next;
}

function applyRefreshLoopMeta(dashboard) {
  const next = structuredClone(dashboard);
  const refreshLoop = getRefreshLoopStatus();
  const worker = refreshLoop?.last_result?.gdelt || {};

  next.meta = next.meta || {};
  next.meta.refresh_loop = {
    enabled: Boolean(refreshLoop?.enabled),
    running: Boolean(refreshLoop?.running),
    last_status: refreshLoop?.last_status || null,
    last_completed_at: refreshLoop?.last_completed_at || null,
    next_run_at: refreshLoop?.next_run_at || null,
    worker: {
      selected_baskets: worker.selected_baskets || [],
      next_basket: worker.next_basket || null,
      baskets_per_cycle: worker.baskets_per_cycle || null,
      rate_limited: Boolean(worker.rate_limited),
      cooldown_until: worker.cooldown_until || null
    }
  };

  return next;
}

function findMetricValue(dashboard, key, fallback = 0) {
  const card = (dashboard?.metrics?.cards || []).find((entry) => entry.key === key);
  return Number(card?.value ?? fallback) || fallback;
}

function countVisibleCorrections(dashboard) {
  return (dashboard?.recent_events?.items || []).filter(
    (item) => item.correction_state && item.correction_state !== "none"
  ).length;
}

function applySignalCycleFallback(dashboard) {
  if (dashboard?.signal_cycle || !dashboard?.trace) {
    return dashboard;
  }

  const next = structuredClone(dashboard);
  const trace = next.trace || {};
  const clusterCount = Number(trace.processed_cluster_count ?? 0) || 0;
  const visibleCount = Number(trace.visible_tape_cluster_count ?? next.recent_events?.items?.length ?? 0) || 0;
  const suppressedClusterCount =
    Number(trace.suppressed_cluster_count ?? next.held_out_field?.held_out_count ?? 0) || 0;
  const correctionRate = findMetricValue(next, "correction_rate", 0);
  const correctionCount = Math.max(
    countVisibleCorrections(next),
    Math.round(correctionRate * Math.max(1, clusterCount))
  );

  next.signal_cycle = buildSignalCycle({
    rawItemCount: Number(trace.raw_item_count ?? clusterCount) || 0,
    clusterCount,
    visibleClusters: Array.from({ length: visibleCount }),
    suppressedClusterCount,
    correctionCount,
    metrics: {
      signalVelocity: findMetricValue(next, "signal_velocity", 0)
    },
    treeOfRelief: next.tree_of_relief || { state: "unknown" }
  });

  return next;
}

router.get("/", async (req, res, next) => {
  try {
    const domain = req.query.domain === "uap" ? "uap" : "signals";
    const { bundle, request } = await getSnapshotBundleForRequest(req.query, { domain });

    const selection = getSnapshotSelection({ domain });
    let dashboard = request.request_mode === "selected_snapshot"
      ? applySnapshotSelectionMeta(bundle.dashboard, selection)
      : structuredClone(bundle.dashboard);
    dashboard.meta = {
      ...(dashboard.meta || {}),
      snapshot_request: request
    };
    dashboard = applyRefreshLoopMeta(dashboard);
    dashboard = applySignalCycleFallback(dashboard);
    dashboard.recent_events.items = await enrichEventItemsWithTranslation(
      dashboard.recent_events?.items || []
    );
    dashboard.held_out_field.items = await enrichHeldOutItemsWithTranslation(
      dashboard.held_out_field?.items || []
    );
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
});

export default router;
