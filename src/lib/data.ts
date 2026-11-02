import { and, desc, eq, gte, inArray, sum } from "drizzle-orm";
import { db, schema } from "../db";
import { periodStart } from "./policy/engine";
import type { PolicyRules } from "./policy/types";

const { wallets, mandates, purchaseRequests, agentRuns, auditEvents } = schema;

export async function getActiveWallet(userId: string) {
  return db.query.wallets.findFirst({
    where: and(eq(wallets.userId, userId), eq(wallets.status, "active")),
    orderBy: desc(wallets.createdAt),
  });
}

export async function getActiveMandate(userId: string) {
  return db.query.mandates.findFirst({
    where: and(eq(mandates.userId, userId), eq(mandates.status, "active")),
    orderBy: desc(mandates.activatedAt),
  });
}

export async function getMandate(id: string) {
  return db.query.mandates.findFirst({ where: eq(mandates.id, id) });
}

/** Paid (and not refunded) spend under a mandate in its current budget period. */
export async function spentInPeriod(mandateId: string, rules: PolicyRules, now = new Date()) {
  const start = rules.budget ? periodStart(rules.budget.period, now) : null;
  const [row] = await db
    .select({ total: sum(purchaseRequests.totalCents) })
    .from(purchaseRequests)
    .where(
      and(
        eq(purchaseRequests.mandateId, mandateId),
        eq(purchaseRequests.status, "paid"),
        start ? gte(purchaseRequests.createdAt, start) : undefined,
      ),
    );
  return Number(row?.total ?? 0);
}

export async function getPurchase(id: string) {
  return db.query.purchaseRequests.findFirst({ where: eq(purchaseRequests.id, id) });
}

export async function listPurchases(limit = 200) {
  return db.query.purchaseRequests.findMany({ orderBy: desc(purchaseRequests.createdAt), limit });
}

export async function listPendingApprovals() {
  return db.query.purchaseRequests.findMany({
    where: eq(purchaseRequests.status, "pending_approval"),
    orderBy: desc(purchaseRequests.createdAt),
  });
}

export async function getRun(id: string) {
  return db.query.agentRuns.findFirst({ where: eq(agentRuns.id, id) });
}

export async function listRuns(limit = 10) {
  return db.query.agentRuns.findMany({ orderBy: desc(agentRuns.createdAt), limit });
}

/** Tasks paused on a question for the person, with the question. */
export async function listWaitingRuns() {
  const runs = await db.query.agentRuns.findMany({
    where: eq(agentRuns.status, "waiting_input"),
    orderBy: desc(agentRuns.createdAt),
  });
  return Promise.all(
    runs.map(async (run) => {
      const question = await db.query.auditEvents.findFirst({
        where: and(eq(auditEvents.runId, run.id), eq(auditEvents.type, "agent.question")),
        orderBy: desc(auditEvents.createdAt),
      });
      return { run, question: question?.payload as { question: string; options: string[] } | undefined };
    }),
  );
}

export async function countWaitingRuns() {
  const rows = await db.select({ id: agentRuns.id }).from(agentRuns).where(eq(agentRuns.status, "waiting_input"));
  return rows.length;
}

export async function listRunEvents(runId: string) {
  return db.query.auditEvents.findMany({ where: eq(auditEvents.runId, runId), orderBy: auditEvents.createdAt });
}

export async function listAuditEvents(limit = 500) {
  return db.query.auditEvents.findMany({ orderBy: desc(auditEvents.createdAt), limit });
}

export async function listPurchasesForRun(runId: string) {
  return db.query.purchaseRequests.findMany({
    where: eq(purchaseRequests.runId, runId),
    orderBy: purchaseRequests.createdAt,
  });
}

export async function countByStatus(statuses: (typeof purchaseRequests.$inferSelect.status)[]) {
  const rows = await db
    .select({ id: purchaseRequests.id })
    .from(purchaseRequests)
    .where(inArray(purchaseRequests.status, statuses));
  return rows.length;
}
