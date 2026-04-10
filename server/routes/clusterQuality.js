import { Router } from "express";
import { buildClusterQuality } from "../services/clusterQualityService.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const hours = Number(req.query.hours || req.query.window_hours || 6);
    const detail = await buildClusterQuality(hours);
    res.json(detail);
  } catch (error) {
    next(error);
  }
});

export default router;
