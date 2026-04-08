import dotenv from "dotenv";
import { ingestRss } from "../server/jobs/ingestRss.js";

dotenv.config();

ingestRss().catch((error) => {
  console.error(error);
  process.exit(1);
});
