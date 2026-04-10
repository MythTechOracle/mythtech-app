import dotenv from "dotenv";
import { runRefreshLiveData } from "../server/jobs/refreshLiveData.js";

dotenv.config();

runRefreshLiveData().catch((error) => {
  console.error(error);
  process.exit(1);
});
