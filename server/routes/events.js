import { Router } from "express";
import { getSnapshotBundleForRequest } from "../services/snapshotService.js";
import { enrichEventItemsWithTranslation } from "../services/translationService.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const domain = req.query.domain === "uap" ? "uap" : "signals";
    const { bundle, request } = await getSnapshotBundleForRequest(req.query, { domain });
    let items = bundle.dashboard.recent_events.items || [];

    const category = req.query.category;
    const eventId = req.query.event_id;

    if (category) {
      const categoryItems = bundle.dashboard.recent_events.category_items?.[category];
      items = categoryItems || items.filter((item) => item.category === category);
    }

    if (eventId) {
      items = items.filter((item) => item.cluster_id === eventId || item.event_id === eventId);
    }

    items = await enrichEventItemsWithTranslation(items);

    res.json({
      title: bundle.dashboard.recent_events.title,
      window: request.window_label,
      request,
      items
    });
  } catch (error) {
    next(error);
  }
});

export default router;
