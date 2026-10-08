import type { CartItem, PolicyRules } from "./types";

/**
 * The demo mandate: "Party supplies, $250 total, ask me for anything over $40,
 * no Amazon, nothing recurring, max 15 of anything."
 */
export const partyMandate: PolicyRules = {
  currency: "USD",
  budget: { amountCents: 25000, period: "total" },
  maxItemPriceCents: null,
  approvalItemThresholdCents: 4000,
  approvalOrderThresholdCents: null,
  maxQuantityPerItem: 15,
  allowedMerchants: null,
  blockedMerchants: ["amazon.com"],
  blockedCategories: [],
  allowRecurring: false,
  allowedHours: null,
  expiresAt: null,
};

export function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: "p1",
    title: "Balloons (50 pack)",
    merchantDomain: "partycity.com",
    unitPriceCents: 1299,
    quantity: 1,
    currency: "USD",
    category: "party supplies",
    recurring: false,
    ...overrides,
  };
}
