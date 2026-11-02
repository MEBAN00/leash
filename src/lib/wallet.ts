import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "../db";
import { getActiveWallet } from "./data";
import { env } from "./env";
import { recordEvent } from "./events";
import { createPaymentTokenFromSetupToken, createWalletSetupToken, deletePaymentToken } from "./paypal/vault";

export const SETUP_TOKEN_COOKIE = "leash_setup_token";

/** Step 1: ask PayPal for an approval link to save the person's wallet. */
export async function beginWalletConnect() {
  const appUrl = env("APP_URL");
  return createWalletSetupToken({
    returnUrl: `${appUrl}/api/paypal/vault/return`,
    cancelUrl: `${appUrl}/api/paypal/vault/return?cancelled=1`,
  });
}

/** Step 2: after approval, exchange the setup token for a reusable payment token. */
export async function completeWalletConnect(userId: string, setupTokenId: string) {
  const token = await createPaymentTokenFromSetupToken(setupTokenId);

  const wallet = await db.transaction(async (tx) => {
    // One active wallet per person: retire the old one, point mandates at the new one.
    await tx
      .update(schema.wallets)
      .set({ status: "revoked" })
      .where(and(eq(schema.wallets.userId, userId), eq(schema.wallets.status, "active")));
    const [w] = await tx
      .insert(schema.wallets)
      .values({
        userId,
        paypalPaymentTokenId: token.paymentTokenId,
        paypalCustomerId: token.customerId,
        payerEmail: token.payerEmail,
      })
      .returning();
    await tx
      .update(schema.mandates)
      .set({ walletId: w.id })
      .where(and(eq(schema.mandates.userId, userId), inArray(schema.mandates.status, ["draft", "active"])));
    return w;
  });

  await recordEvent({ type: "wallet.connected", payload: { walletId: wallet.id, payerEmail: wallet.payerEmail } });
  return wallet;
}

/** Delete the saved token at PayPal so Leash can never charge it again. */
export async function disconnectWallet(userId: string) {
  const wallet = await getActiveWallet(userId);
  if (!wallet) return;
  await deletePaymentToken(wallet.paypalPaymentTokenId);
  await db.update(schema.wallets).set({ status: "revoked" }).where(eq(schema.wallets.id, wallet.id));
  await db
    .update(schema.mandates)
    .set({ status: "revoked" })
    .where(and(eq(schema.mandates.userId, userId), eq(schema.mandates.status, "active")));
}
