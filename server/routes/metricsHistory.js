import { Router } from "express";
import { getSnapshotBundle, buildSnapshot } from "../services/snapshotService.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const bundle = getSnapshotBundle() || (await buildSnapshot(6));
    res.json(bundle.history);
  } catch (error) {
    next(error);
  }
});

export default router;
