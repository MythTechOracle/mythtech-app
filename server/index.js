import dotenv from "dotenv";
import { createServer } from "./app.js";
import { startRefreshLoop } from "./services/refreshLoopService.js";

dotenv.config();

const port = Number(process.env.PORT || 8787);
const server = createServer();

server.listen(port, () => {
  console.log(JSON.stringify({ message: "Live Signals API ready", port }, null, 2));
  startRefreshLoop(process.env);
});
