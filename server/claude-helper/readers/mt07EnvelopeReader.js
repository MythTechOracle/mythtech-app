import { getSnapshotBundle, getSnapshotSelection } from "../../services/snapshotService.js";
import { buildMt07ResultEnvelope } from "../../services/mt07EnvelopeService.js";

export function readMt07EnvelopeAuditContext() {
  const bundle = getSnapshotBundle();
  if (!bundle) {
    return {
      available: false,
      message: "No selected snapshot is available for MT-07 envelope audit context."
    };
  }

  const selection = getSnapshotSelection();
  return {
    available: true,
    envelope: buildMt07ResultEnvelope({ bundle, selection })
  };
}
