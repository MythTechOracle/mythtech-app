import { Router } from "express";
import { buildInfrastructureBackfill } from "../services/infrastructureBackfillService.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const payload = await buildInfrastructureBackfill({
      window: req.query.window,
      hours: req.query.hours,
      window_hours: req.query.window_hours,
      current_window: req.query.current_window,
      current_window_hours: req.query.current_window_hours,
      domain: req.query.domain,
      sample_limit: req.query.sample_limit
    });
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

export default router;
