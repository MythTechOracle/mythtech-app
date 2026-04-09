import dotenv from "dotenv";
import { ingestAcled } from "../server/jobs/ingestAcled.js";

dotenv.config();

ingestAcled().catch((error) => {
  console.error(error);
  process.exit(1);
});
