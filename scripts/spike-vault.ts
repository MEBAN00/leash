// Week 1 risk check: save a sandbox PayPal wallet, then charge it with no buyer present.
//
//   pnpm spike:vault start    create an approval link; approve it as the sandbox personal account
//   pnpm spike:vault finish   save the approved wallet + charge $1.00 with no buyer present
//   pnpm spike:vault charge   charge the saved wallet again ($2.50)
//   pnpm spike:vault refund   refund the last charge

import "./_env";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { env } from "../src/lib/env";
import {
  chargeVaultedWallet,
  createPaymentTokenFromSetupToken,
  createWalletSetupToken,
  refundCapture,
} from "../src/lib/paypal/vault";

const STATE = ".spike-state.json";
type State = {
  setupTokenId?: string;
  paymentTokenId?: string;
  payerEmail?: string | null;
  lastCaptureId?: string | null;
};
const load = (): State => (existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {});
const save = (s: State) => writeFileSync(STATE, JSON.stringify(s, null, 2));

async function start() {
  const appUrl = env("APP_URL");
  const { setupTokenId, approveUrl } = await createWalletSetupToken({
    returnUrl: `${appUrl}/vault/return`,
    cancelUrl: `${appUrl}/vault/return?cancelled=1`,
  });
  save({ ...load(), setupTokenId });
  console.log(`\nSetup token: ${setupTokenId}`);
  console.log(`Open this link and log in with your SANDBOX *personal* (buyer) account:\n\n  ${approveUrl}\n`);
  console.log("Then run: pnpm spike:vault finish");
}

async function finish() {
  const { setupTokenId } = load();
  if (!setupTokenId) throw new Error("No setup token. Run `pnpm spike:vault start` first.");
  const token = await createPaymentTokenFromSetupToken(setupTokenId);
  console.log(`\n✓ Wallet saved. vault_id = ${token.paymentTokenId} (payer ${token.payerEmail ?? "unknown"})`);
  save({ ...load(), setupTokenId: undefined, paymentTokenId: token.paymentTokenId, payerEmail: token.payerEmail });
  await charge(token.paymentTokenId, 100);
  console.log("\nWeek-1 PayPal risk retired 🎉  Try `pnpm spike:vault charge` to charge it again.");
}

async function charge(vaultId: string, cents: number) {
  const result = await chargeVaultedWallet({
    vaultId,
    description: "Leash spike test charge",
    idempotencyKey: randomUUID(),
    items: [{ title: "Spike test item", merchantDomain: "example.com", unitPriceCents: cents, quantity: 1 }],
  });
  console.log(`\n✓ Charged with no buyer present: order ${result.orderId} → ${result.status}, capture ${result.captureId}`);
  save({ ...load(), lastCaptureId: result.captureId });
}

async function main() {
  const mode = process.argv[2];
  const state = load();

  switch (mode) {
    case "start":
      return start();
    case "finish":
      return finish();
    case "charge":
      if (!state.paymentTokenId) throw new Error("No saved wallet yet. Run `pnpm spike:vault start` first.");
      return charge(state.paymentTokenId, 250);
    case "refund": {
      if (!state.lastCaptureId) throw new Error("No capture to refund.");
      const r = await refundCapture(state.lastCaptureId, randomUUID());
      return console.log(`\n✓ Refund ${r.id} → ${r.status}`);
    }
    default:
      console.log("Usage: pnpm spike:vault <start|finish|charge|refund>");
  }
}
main().catch((e) => {
  console.error("\n✗", e.message);
  if (String(e.message).includes("NOT_ENABLED") || String(e.message).includes("PERMISSION_DENIED")) {
    console.error("  → Tick \"Save payment methods\" on the sandbox app: Apps & Credentials → your app → Features.");
  }
  process.exit(1);
});
