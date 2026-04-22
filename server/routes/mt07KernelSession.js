import { Router } from "express";
import { buildSnapshot, getSnapshotBundle, getSnapshotSelection } from "../services/snapshotService.js";
import { buildMt07KernelSessionPacket } from "../services/mt07KernelSessionService.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    let bundle = getSnapshotBundle();
    if (!bundle) {
      bundle = await buildSnapshot(6);
    }

    const selection = getSnapshotSelection();
    const packet = buildMt07KernelSessionPacket({ bundle, selection });
    res.json(packet);
  } catch (error) {
    next(error);
  }
});

export default router;
