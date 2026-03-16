import postgres from "postgres";
import { config } from "./index.js";

export const sql = postgres(config.databaseUrl);
