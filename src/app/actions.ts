"use server";

import { refresh, revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { executeRun, replyToRun, startRun } from "@/lib/agent/run";
import { getActiveMandate, getActiveWallet, getMandate, getPurchase, getRun } from "@/lib/data";
import { getDemoUser } from "@/lib/demo-user";
import { activateMandate, compileMandate, createDraftMandate, revokeMandate } from "@/lib/mandates";
import { approvePurchase, refundPurchase, rejectPurchase } from "@/lib/purchases";
import { beginWalletConnect, disconnectWallet, SETUP_TOKEN_COOKIE } from "@/lib/wallet";

/** `value` echoes the submitted text so React's post-action form reset doesn't wipe it. */
export type ActionState = { error?: string; value?: string } | undefined;

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong. Try again.");

// Wallet ---------------------------------------------------------------------

export async function connectWalletAction() {
  await getDemoUser();
  let link: Awaited<ReturnType<typeof beginWalletConnect>>;
  try {
    link = await beginWalletConnect();
  } catch (err) {
    console.error("Starting PayPal wallet connect failed", err);
    redirect("/wallet?status=failed");
  }
  (await cookies()).set(SETUP_TOKEN_COOKIE, link.setupTokenId, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60, path: "/" });
  redirect(link.approveUrl);
}

export async function disconnectWalletAction() {
  const user = await getDemoUser();
  try {
    await disconnectWallet(user.id);
  } catch (err) {
    // The wallet stays connected: PayPal must confirm the token is deleted first.
    console.error("Disconnecting PayPal wallet failed", err);
    redirect("/wallet?status=disconnect_failed");
  }
  revalidatePath("/", "layout"); // the header shows wallet status
  redirect("/wallet?status=disconnected");
}

// Rules ----------------------------------------------------------------------

export async function compileRulesAction(_: ActionState, form: FormData): Promise<ActionState> {
  const prompt = String(form.get("prompt") ?? "").trim();
  const timezone = String(form.get("timezone") ?? "UTC");
  if (prompt.length < 8) return { error: "Tell the agent a little more: what it can buy, and your limits.", value: prompt };

  const user = await getDemoUser();
  const wallet = await getActiveWallet(user.id);
  if (!wallet) return { error: "Connect your PayPal wallet first, so the rules have a wallet to protect.", value: prompt };

  let id: string;
  try {
    const compiled = await compileMandate(prompt, timezone);
    const draft = await createDraftMandate({ userId: user.id, walletId: wallet.id, prompt, compiled });
    id = draft.id;
  } catch (err) {
    return { error: `Couldn't read those rules: ${errorMessage(err)}`, value: prompt };
  }
  redirect(`/rules/${id}`);
}

export async function activateRulesAction(mandateId: string) {
  const user = await getDemoUser();
  const mandate = await getMandate(mandateId);
  if (!mandate || mandate.userId !== user.id || mandate.status !== "draft") redirect("/rules");
  await activateMandate(mandateId, user.id);
  redirect("/?activated=1");
}

export async function revokeRulesAction(mandateId: string) {
  const user = await getDemoUser();
  await revokeMandate(mandateId, user.id);
  redirect("/rules/new");
}

// Agent ----------------------------------------------------------------------

export async function startTaskAction(_: ActionState, form: FormData): Promise<ActionState> {
  const task = String(form.get("task") ?? "").trim();
  const mode = form.get("mode") === "compromised" ? "compromised" : "normal";
  if (task.length < 4) return { error: "Give the agent a task, like “Plan a birthday party for 12 kids”.", value: task };

  const user = await getDemoUser();
  const mandate = await getActiveMandate(user.id);
  if (!mandate) return { error: "Activate your rules before the agent can shop.", value: task };

  const run = await startRun({ mandate, task, mode });
  after(() => executeRun(run, mandate));
  redirect(`/runs/${run.id}`);
}

/** The person answers the agent's question (or adds a follow-up); the task carries on. */
export async function replyToRunAction(_: ActionState, form: FormData): Promise<ActionState> {
  const runId = String(form.get("runId") ?? "");
  // A tapped suggested answer arrives as "choice"; typed text as "reply".
  const text = String(form.get("choice") || form.get("reply") || "").trim();
  if (!text) return { error: "Type a reply, or tap one of the answers." };

  const user = await getDemoUser();
  const run = await getRun(runId);
  const mandate = run && (await getMandate(run.mandateId));
  if (!run || !mandate || mandate.userId !== user.id) return { error: "Task not found." };
  if (mandate.status !== "active") return { error: "These rules were switched off. Activate rules to carry on.", value: text };

  const resumed = await replyToRun(runId, text);
  if (!resumed) return { error: "The agent is still working. Reply when it's done.", value: text };
  after(() => executeRun(resumed, mandate));
  refresh();
}

// Purchases ------------------------------------------------------------------

async function ownPurchase(purchaseId: string) {
  const user = await getDemoUser();
  const purchase = await getPurchase(purchaseId);
  const mandate = purchase && (await getMandate(purchase.mandateId));
  if (!purchase || !mandate || mandate.userId !== user.id) throw new Error("Purchase not found.");
  return purchase;
}

export async function approveAction(purchaseId: string): Promise<ActionState> {
  try {
    await ownPurchase(purchaseId);
    const result = await approvePurchase(purchaseId);
    if (result.status === "failed") return { error: result.failureReason ?? "PayPal couldn't complete the payment." };
  } catch (err) {
    return { error: errorMessage(err) };
  } finally {
    refresh();
  }
}

export async function declineAction(purchaseId: string): Promise<ActionState> {
  try {
    await ownPurchase(purchaseId);
    await rejectPurchase(purchaseId);
  } catch (err) {
    return { error: errorMessage(err) };
  } finally {
    refresh();
  }
}

export async function refundAction(purchaseId: string): Promise<ActionState> {
  try {
    await ownPurchase(purchaseId);
    await refundPurchase(purchaseId);
  } catch (err) {
    return { error: errorMessage(err) };
  } finally {
    refresh();
  }
}
