import { Router } from "express";
import { getSnapshotBundleForRequest } from "../services/snapshotService.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const domain = req.query.domain === "uap" ? "uap" : "signals";
    const { bundle, request } = await getSnapshotBundleForRequest(req.query, { domain });
    res.json({
      ...bundle.history,
      window: request.window_label,
      request
    });
  } catch (error) {
    next(error);
  }
});

export default router;
