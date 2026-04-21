import { getRefreshLoopStatus } from "../../services/refreshLoopService.js";

export function readHealthAuditContext() {
  return {
    available: true,
    ok: true,
    service: "live-signals-app",
    mode: "local_lab",
    refresh_loop: getRefreshLoopStatus()
  };
}
