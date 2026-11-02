import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/env";
import * as schema from "./schema";

function createClient() {
  const url = env("DATABASE_URL");
  // Supabase's transaction pooler (port 6543) doesn't support prepared statements.
  return postgres(url, { prepare: !url.includes(":6543"), max: 10 });
}

// Reuse one pool across dev hot reloads.
const g = globalThis as unknown as { leashSql?: ReturnType<typeof postgres> };
const client = (g.leashSql ??= createClient());

export const db = drizzle(client, { schema });
export { schema };
