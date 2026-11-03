import { desc } from "drizzle-orm";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

/** Latest durable event cursor, used by the client to know when to refresh. */
export async function GET() {
  const [latest] = await db
    .select({ id: schema.auditEvents.id })
    .from(schema.auditEvents)
    .orderBy(desc(schema.auditEvents.createdAt))
    .limit(1);

  return Response.json(latest ?? null, { headers: { "Cache-Control": "no-store" } });
}
