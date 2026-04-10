import dotenv from "dotenv";
import { ingestGdelt } from "../server/jobs/ingestGdelt.js";

dotenv.config();

ingestGdelt().catch((error) => {
  console.error(error);
  process.exit(1);
});
