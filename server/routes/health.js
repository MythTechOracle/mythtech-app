import { Router } from "express";
import { getRefreshLoopStatus } from "../services/refreshLoopService.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "live-signals-app",
    mode: "local_lab",
    refresh_loop: getRefreshLoopStatus()
  });
});

export default router;
