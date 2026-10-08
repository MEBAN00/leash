import type { CartItem } from "../policy/types";
import { linkHref, paypal, type Link } from "./client";

// Flow: create a setup token -> user approves it on PayPal -> exchange it for a
// payment token (vault_id) -> Leash can charge that vault_id later without the
// user present. Only the payment executor should ever call chargeVaultedWallet.

type SetupTokenResponse = { id: string; status: string; links: Link[] };

export async function createWalletSetupToken(opts: { returnUrl: string; cancelUrl: string }) {
  const res = await paypal<SetupTokenResponse>("create setup token", "POST", "/v3/vault/setup-tokens", {
    payment_source: {
      paypal: {
        description: "Leash: lets your shopping agent pay within the rules you set",
        permit_multiple_payment_tokens: false,
        usage_pattern: "IMMEDIATE",
        usage_type: "MERCHANT",
        customer_type: "CONSUMER",
        experience_context: {
          brand_name: "Leash",
          shipping_preference: "NO_SHIPPING",
          return_url: opts.returnUrl,
          cancel_url: opts.cancelUrl,
        },
      },
    },
  });
  const approveUrl = linkHref(res.links, "approve");
  if (!approveUrl) throw new Error(`Setup token ${res.id} has no approve link`);
  return { setupTokenId: res.id, approveUrl };
}

type PaymentTokenResponse = {
  id: string;
  customer?: { id: string };
  payment_source?: { paypal?: { email_address?: string } };
};

export async function createPaymentTokenFromSetupToken(setupTokenId: string) {
  const res = await paypal<PaymentTokenResponse>("create payment token", "POST", "/v3/vault/payment-tokens", {
    payment_source: { token: { id: setupTokenId, type: "SETUP_TOKEN" } },
  });
  return {
    paymentTokenId: res.id,
    customerId: res.customer?.id ?? null,
    payerEmail: res.payment_source?.paypal?.email_address ?? null,
  };
}

export async function deletePaymentToken(paymentTokenId: string) {
  await paypal("delete payment token", "DELETE", `/v3/vault/payment-tokens/${paymentTokenId}`);
}

type OrderResponse = {
  id: string;
  status: string;
  purchase_units?: { payments?: { captures?: { id: string; status: string }[] } }[];
};

const money = (cents: number, currency = "USD") => ({ currency_code: currency, value: (cents / 100).toFixed(2) });

/**
 * Charge a saved wallet with no buyer present. Leash is the merchant of
 * record in the hackathon build; each cart line becomes a PayPal line item.
 * `idempotencyKey` should be the purchase request id so retries never double-charge.
 */
export async function chargeVaultedWallet(opts: {
  vaultId: string;
  items: Pick<CartItem, "title" | "merchantDomain" | "unitPriceCents" | "quantity">[];
  description: string;
  idempotencyKey: string;
}) {
  const totalCents = opts.items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
  const order = await paypal<OrderResponse>(
    "create vaulted order",
    "POST",
    "/v2/checkout/orders",
    {
      intent: "CAPTURE",
      payment_source: { paypal: { vault_id: opts.vaultId } },
      purchase_units: [
        {
          reference_id: opts.idempotencyKey.slice(0, 256),
          custom_id: opts.idempotencyKey.slice(0, 127),
          description: opts.description.slice(0, 127),
          amount: { ...money(totalCents), breakdown: { item_total: money(totalCents) } },
          items: opts.items.map((i) => ({
            name: i.title.slice(0, 127),
            description: `via ${i.merchantDomain}`.slice(0, 127),
            unit_amount: money(i.unitPriceCents),
            quantity: String(i.quantity),
            category: "PHYSICAL_GOODS",
          })),
        },
      ],
    },
    opts.idempotencyKey,
  );

  // Vaulted PayPal orders normally come back COMPLETED; capture if not.
  const final =
    order.status === "COMPLETED"
      ? order
      : await paypal<OrderResponse>("capture order", "POST", `/v2/checkout/orders/${order.id}/capture`, {}, `${opts.idempotencyKey}-capture`);

  const capture = final.purchase_units?.[0]?.payments?.captures?.[0];
  return { orderId: final.id, status: final.status, captureId: capture?.id ?? null, totalCents };
}

export async function refundCapture(captureId: string, idempotencyKey: string) {
  return paypal<{ id: string; status: string }>(
    "refund capture",
    "POST",
    `/v2/payments/captures/${captureId}/refund`,
    {},
    idempotencyKey,
  );
}
