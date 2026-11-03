import { db, schema } from "../db";
import type { AuditEvent } from "../db/schema";

// Every agent step and policy decision is written to the audit log. Clients
// poll the latest row, which works across ephemeral and multi-instance hosts.

export type EventType =
  | "run.started"
  | "run.finished"
  | "run.failed"
  | "agent.search"
  | "agent.question"
  | "person.reply"
  | "purchase.proposed"
  | "purchase.approved"
  | "purchase.rejected"
  | "purchase.paid"
  | "purchase.failed"
  | "purchase.refunded"
  | "mandate.activated"
  | "wallet.connected";

export async function recordEvent(e: {
  type: EventType;
  runId?: string | null;
  mandateId?: string | null;
  payload: Record<string, unknown>;
}): Promise<AuditEvent> {
  const [row] = await db
    .insert(schema.auditEvents)
    .values({ type: e.type, runId: e.runId ?? null, mandateId: e.mandateId ?? null, payload: e.payload })
    .returning();
  return row;
}
