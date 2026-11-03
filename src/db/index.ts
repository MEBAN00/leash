import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/env";
import * as schema from "./schema";

function createClient() {
  const url = env("DATABASE_URL");
  const serverless = process.env.VERCEL === "1" || url.includes(":6543");
  // Supabase's transaction pooler and ephemeral hosts need a tiny local pool
  // with prepared statements disabled. Local and long-lived servers keep the
  // larger pool used during development.
  return postgres(url, {
    prepare: !serverless,
    max: serverless ? 1 : 10,
    ssl: serverless ? "require" : undefined,
  });
}

// Reuse one pool across dev hot reloads.
const g = globalThis as unknown as { leashSql?: ReturnType<typeof postgres> };
const client = (g.leashSql ??= createClient());

export const db = drizzle(client, { schema });
export { schema };
