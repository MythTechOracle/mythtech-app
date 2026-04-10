import { Router } from "express";
import { buildAcledProof } from "../services/acledProofService.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const hours = Number(req.query.hours || req.query.window_hours || 24);
    const detail = await buildAcledProof(hours);
    res.json(detail);
  } catch (error) {
    next(error);
  }
});

export default router;
