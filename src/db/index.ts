import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/env";
import * as schema from "./schema";

const url = env("DATABASE_URL");

// Supabase's transaction pooler (port 6543) doesn't support prepared statements.
const client = postgres(url, { prepare: !url.includes(":6543") });

export const db = drizzle(client, { schema });
export { schema };
