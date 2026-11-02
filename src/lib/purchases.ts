import { and, eq } from "drizzle-orm";
import { db, schema } from "../db";
import type { Mandate, Purchase } from "../db/schema";
import { getMandate, getPurchase, spentInPeriod } from "./data";
import { recordEvent } from "./events";
import { PayPalError } from "./paypal/client";
import { chargeVaultedWallet, refundCapture } from "./paypal/vault";
import { evaluate } from "./policy/engine";
import type { Cart, PolicyResult } from "./policy/types";

const { purchaseRequests } = schema;

/**
 * The only path from "agent wants to buy" to money moving. The agent supplies
 * a cart; the policy engine decides; ALLOW is charged immediately, ASK waits
 * for the human, DENY is recorded and refused.
 */
export async function proposePurchase(opts: {
  runId: string;
  mandate: Mandate;
  cart: Cart;
  rationale: string;
}): Promise<{ purchase: Purchase; result: PolicyResult }> {
  const { runId, mandate, cart, rationale } = opts;
  const spent = await spentInPeriod(mandate.id, mandate.rules);
  const result = evaluate(mandate.rules, cart, { now: new Date(), spentInPeriodCents: spent });

  const status = { ALLOW: "approved", ASK: "pending_approval", DENY: "denied" } as const;
  const [purchase] = await db
    .insert(purchaseRequests)
    .values({
      runId,
      mandateId: mandate.id,
      cart,
      rationale,
      totalCents: result.totalCents,
      decision: result.decision,
      checks: result.checks,
      status: status[result.decision],
      decidedAt: result.decision === "ASK" ? null : new Date(),
    })
    .returning();

  await recordEvent({
    type: "purchase.proposed",
    runId,
    mandateId: mandate.id,
    payload: { purchaseId: purchase.id, decision: result.decision, totalCents: result.totalCents },
  });

  if (result.decision === "ALLOW") {
    const paid = await executePurchase(purchase.id);
    return { purchase: paid, result };
  }
  return { purchase, result };
}

/** Charge an approved purchase. Atomic status claim prevents double charges. */
export async function executePurchase(purchaseId: string): Promise<Purchase> {
  const [claimed] = await db
    .update(purchaseRequests)
    .set({ status: "paid" })
    .where(and(eq(purchaseRequests.id, purchaseId), eq(purchaseRequests.status, "approved")))
    .returning();
  if (!claimed) {
    const current = await getPurchase(purchaseId);
    if (!current) throw new Error(`Purchase ${purchaseId} not found`);
    return current;
  }

  try {
    const mandate = await getMandate(claimed.mandateId);
    const wallet = mandate && (await db.query.wallets.findFirst({ where: eq(schema.wallets.id, mandate.walletId) }));
    if (!wallet || wallet.status !== "active") throw new Error("No active PayPal wallet for this mandate.");

    const charge = await chargeVaultedWallet({
      vaultId: wallet.paypalPaymentTokenId,
      items: claimed.cart.items,
      description: `Leash: ${claimed.rationale ?? "agent purchase"}`,
      idempotencyKey: claimed.id,
    });
    if (charge.status !== "COMPLETED") throw new Error(`PayPal order ended ${charge.status}`);

    const [paid] = await db
      .update(purchaseRequests)
      .set({ paypalOrderId: charge.orderId, paypalCaptureId: charge.captureId })
      .where(eq(purchaseRequests.id, claimed.id))
      .returning();
    await recordEvent({
      type: "purchase.paid",
      runId: paid.runId,
      mandateId: paid.mandateId,
      payload: { purchaseId: paid.id, totalCents: paid.totalCents, paypalOrderId: charge.orderId },
    });
    return paid;
  } catch (err) {
    const reason = err instanceof PayPalError ? `PayPal: ${err.body.slice(0, 300)}` : (err as Error).message;
    const [failed] = await db
      .update(purchaseRequests)
      .set({ status: "failed", failureReason: reason })
      .where(eq(purchaseRequests.id, claimed.id))
      .returning();
    await recordEvent({
      type: "purchase.failed",
      runId: failed.runId,
      mandateId: failed.mandateId,
      payload: { purchaseId: failed.id, reason },
    });
    return failed;
  }
}

/**
 * Human approval of an ASK. The policy is re-checked first: the user can
 * override "ask" rules, but never hard limits (budget may have been used up
 * by other purchases while this one waited).
 */
export async function approvePurchase(purchaseId: string): Promise<Purchase> {
  const purchase = await getPurchase(purchaseId);
  if (!purchase || purchase.status !== "pending_approval") throw new Error("This purchase is no longer waiting for approval.");
  const mandate = await getMandate(purchase.mandateId);
  if (!mandate || mandate.status !== "active") throw new Error("The mandate for this purchase is no longer active.");

  const spent = await spentInPeriod(mandate.id, mandate.rules);
  const recheck = evaluate(mandate.rules, purchase.cart, { now: new Date(), spentInPeriodCents: spent });
  if (recheck.decision === "DENY") {
    const [denied] = await db
      .update(purchaseRequests)
      .set({ status: "denied", decision: "DENY", checks: recheck.checks, decidedAt: new Date() })
      .where(and(eq(purchaseRequests.id, purchaseId), eq(purchaseRequests.status, "pending_approval")))
      .returning();
    if (denied) {
      await recordEvent({
        type: "purchase.rejected",
        runId: denied.runId,
        mandateId: denied.mandateId,
        payload: { purchaseId, by: "policy", reasons: recheck.checks.filter((c) => c.outcome === "deny").map((c) => c.reason) },
      });
    }
    throw new Error(recheck.checks.find((c) => c.outcome === "deny")?.reason ?? "Policy no longer allows this purchase.");
  }

  const [approved] = await db
    .update(purchaseRequests)
    .set({ status: "approved", decidedAt: new Date() })
    .where(and(eq(purchaseRequests.id, purchaseId), eq(purchaseRequests.status, "pending_approval")))
    .returning();
  if (!approved) throw new Error("This purchase is no longer waiting for approval.");

  await recordEvent({ type: "purchase.approved", runId: approved.runId, mandateId: approved.mandateId, payload: { purchaseId } });
  return executePurchase(purchaseId);
}

export async function rejectPurchase(purchaseId: string): Promise<Purchase> {
  const [rejected] = await db
    .update(purchaseRequests)
    .set({ status: "rejected", decidedAt: new Date() })
    .where(and(eq(purchaseRequests.id, purchaseId), eq(purchaseRequests.status, "pending_approval")))
    .returning();
  if (!rejected) throw new Error("This purchase is no longer waiting for approval.");
  await recordEvent({ type: "purchase.rejected", runId: rejected.runId, mandateId: rejected.mandateId, payload: { purchaseId, by: "user" } });
  return rejected;
}

export async function refundPurchase(purchaseId: string): Promise<Purchase> {
  const purchase = await getPurchase(purchaseId);
  if (!purchase || purchase.status !== "paid" || !purchase.paypalCaptureId) throw new Error("Only paid purchases can be refunded.");

  const refund = await refundCapture(purchase.paypalCaptureId, `refund-${purchase.id}`);
  const [refunded] = await db
    .update(purchaseRequests)
    .set({ status: "refunded" })
    .where(and(eq(purchaseRequests.id, purchaseId), eq(purchaseRequests.status, "paid")))
    .returning();
  await recordEvent({
    type: "purchase.refunded",
    runId: purchase.runId,
    mandateId: purchase.mandateId,
    payload: { purchaseId, refundId: refund.id, totalCents: purchase.totalCents },
  });
  return refunded ?? purchase;
}

