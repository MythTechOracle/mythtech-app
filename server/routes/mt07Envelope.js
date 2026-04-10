import { Router } from "express";
import { buildSnapshot, getSnapshotBundle, getSnapshotSelection } from "../services/snapshotService.js";
import { buildMt07ResultEnvelope } from "../services/mt07EnvelopeService.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    let bundle = getSnapshotBundle();
    if (!bundle) {
      bundle = await buildSnapshot(6);
    }

    const selection = getSnapshotSelection();
    const envelope = buildMt07ResultEnvelope({ bundle, selection });
    res.json(envelope);
  } catch (error) {
    next(error);
  }
});

export default router;
