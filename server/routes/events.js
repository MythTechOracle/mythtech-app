import { Router } from "express";
import { getSnapshotBundle, buildSnapshot } from "../services/snapshotService.js";
import { enrichEventItemsWithTranslation } from "../services/translationService.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const bundle = getSnapshotBundle() || (await buildSnapshot(6));
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
      items
    });
  } catch (error) {
    next(error);
  }
});

export default router;
