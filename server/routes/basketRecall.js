import { Router } from "express";
import { buildBasketRecall } from "../services/basketRecallService.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const payload = await buildBasketRecall({
      window: req.query.window,
      hours: req.query.hours,
      window_hours: req.query.window_hours,
      domain: req.query.domain,
      sample_limit: req.query.sample_limit
    });
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

export default router;
