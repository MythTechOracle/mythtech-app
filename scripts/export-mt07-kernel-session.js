import fs from "node:fs";
import path from "node:path";
import { initDb } from "../server/db/db.js";
import { buildSnapshot, getSnapshotBundle, getSnapshotSelection } from "../server/services/snapshotService.js";
import { buildMt07KernelSessionPacket } from "../server/services/mt07KernelSessionService.js";

function parseOutPath(argv) {
  const outIndex = argv.indexOf("--out");
  if (outIndex >= 0 && argv[outIndex + 1]) {
    return path.resolve(process.cwd(), argv[outIndex + 1]);
  }
  return path.resolve(process.cwd(), "delta_ci", "session", "session.json");
}

async function main() {
  initDb();

  let bundle = getSnapshotBundle();
  if (!bundle) {
    bundle = await buildSnapshot(6);
  }

  const selection = getSnapshotSelection();
  const packet = buildMt07KernelSessionPacket({ bundle, selection });
  const outPath = parseOutPath(process.argv.slice(2));

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        out: outPath,
        schema_id: packet.schema_id,
        kernel_id: packet.kernel_id,
        snapshot_id: packet.source_context?.snapshot_id ?? null
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`Failed to export MT-07 kernel session packet: ${error.message}`);
  process.exitCode = 1;
});
