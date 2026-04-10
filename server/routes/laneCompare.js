import { Router } from "express";
import { buildLaneCompare } from "../services/laneCompareService.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const hours = Number(req.query.hours || 24);
    const payload = await buildLaneCompare(hours);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

export default router;
