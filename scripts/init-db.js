import dotenv from "dotenv";
import { initDb } from "../server/db/db.js";

dotenv.config();
initDb();
console.log("SQLite schema initialized.");
