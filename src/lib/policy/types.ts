import { z } from "zod";

// All money is integer cents. The LLM compiles plain English into PolicyRules;
// the engine that enforces them is plain deterministic code.

export const policyRulesSchema = z.object({
  currency: z.literal("USD"),
  budget: z
    .object({
      amountCents: z.number().int().positive(),
      period: z.enum(["day", "week", "month", "total"]),
    })
    .nullable()
    .describe("Total spend limit over a period. Hard limit: exceeding it is denied."),
  maxItemPriceCents: z
    .number().int().positive().nullable()
    .describe("No single item may cost more than this. Hard limit."),
  approvalItemThresholdCents: z
    .number().int().positive().nullable()
    .describe("Items priced above this need the user's approval."),
  approvalOrderThresholdCents: z
    .number().int().positive().nullable()
    .describe("Orders totalling above this need the user's approval."),
  maxQuantityPerItem: z.number().int().positive().nullable(),
  allowedMerchants: z
    .array(z.string())
    .nullable()
    .describe("Merchant domains, e.g. target.com. If set, only these are allowed."),
  blockedMerchants: z.array(z.string()).describe("Merchant domains that are never allowed."),
  blockedCategories: z.array(z.string()).describe("Lowercase category keywords that are never allowed."),
  allowRecurring: z.boolean().describe("Whether subscriptions / recurring charges are allowed."),
  allowedHours: z
    .object({
      start: z.number().int().min(0).max(23),
      end: z.number().int().min(0).max(24),
      timezone: z.string(),
    })
    .nullable()
    .describe("Local hours [start, end) during which spending is allowed. May wrap midnight."),
  expiresAt: z.string().datetime().nullable(),
});

export type PolicyRules = z.infer<typeof policyRulesSchema>;

export const cartItemSchema = z.object({
  productId: z.string(),
  title: z.string(),
  merchantDomain: z.string(),
  unitPriceCents: z.number().int(),
  quantity: z.number().int(),
  currency: z.string(),
  category: z.string().nullable(),
  recurring: z.boolean(),
});

export const cartSchema = z.object({ items: z.array(cartItemSchema) });

export type CartItem = z.infer<typeof cartItemSchema>;
export type Cart = z.infer<typeof cartSchema>;

export type Decision = "ALLOW" | "ASK" | "DENY";

export type PolicyCheck = {
  rule: string;
  outcome: "pass" | "ask" | "deny";
  reason: string;
};

export type PolicyResult = {
  decision: Decision;
  totalCents: number;
  checks: PolicyCheck[];
};

export type PolicyContext = {
  now: Date;
  /** What has already been spent (paid) in the current budget period. */
  spentInPeriodCents: number;
};
