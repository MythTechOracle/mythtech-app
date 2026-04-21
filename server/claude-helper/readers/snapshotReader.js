import { getSnapshotBundle, getSnapshotSelection } from "../../services/snapshotService.js";

export function readSnapshotSelectionAuditContext() {
  return {
    available: true,
    ...getSnapshotSelection()
  };
}

export function readSnapshotBundleAuditContext() {
  return {
    available: true,
    ...getSnapshotBundle({ mode: "selected" })
  };
}
