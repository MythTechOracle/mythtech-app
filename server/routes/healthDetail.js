import { Router } from "express";
import { buildHealthDetail } from "../services/auditService.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const hours = Number(req.query.window_hours || 6);
    const detail = await buildHealthDetail(hours);
    res.json(detail);
  } catch (error) {
    next(error);
  }
});

export default router;
