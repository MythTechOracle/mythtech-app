import dotenv from "dotenv";
import { ingestRss } from "../server/jobs/ingestRss.js";

dotenv.config();

ingestRss({
  domain: process.env.RSS_DOMAIN || undefined
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
