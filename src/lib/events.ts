import { EventEmitter } from "node:events";
import { db, schema } from "../db";
import type { AuditEvent } from "../db/schema";

// Every agent step and policy decision is written to the audit log and
// broadcast in-process so open pages update live over SSE. Railway runs one
// long-lived Node process, so an in-memory emitter is enough.

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

const g = globalThis as unknown as { leashBus?: EventEmitter };
const bus = (g.leashBus ??= new EventEmitter().setMaxListeners(100));

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
  bus.emit("event", row);
  return row;
}

export function subscribe(fn: (e: AuditEvent) => void): () => void {
  bus.on("event", fn);
  return () => bus.off("event", fn);
}
