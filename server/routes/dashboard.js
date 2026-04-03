import { Router } from "express";
import { getSnapshotBundle, getSnapshotSelection, buildSnapshot } from "../services/snapshotService.js";
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

router.get("/", async (_req, res, next) => {
  try {
    let bundle = getSnapshotBundle();
    if (!bundle) {
      bundle = await buildSnapshot(6);
    }

    const selection = getSnapshotSelection();
    const dashboard = applyRefreshLoopMeta(applySnapshotSelectionMeta(bundle.dashboard, selection));
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
