import { usd } from "./engine";
import type { PolicyRules } from "./types";

export type RuleLine = {
  key: string;
  /** "limit": hard limit (DENY). "ask": needs approval (ASK). "allow": a permission. */
  kind: "limit" | "ask" | "allow";
  label: string;
  value: string;
};

const periodLabel = { day: "per day", week: "per week", month: "per month", total: "in total" } as const;

/** Human-readable rule cards for a compiled mandate. */
export function describeRules(r: PolicyRules): RuleLine[] {
  const lines: RuleLine[] = [];

  if (r.budget)
    lines.push({ key: "budget", kind: "limit", label: "Budget", value: `${usd(r.budget.amountCents)} ${periodLabel[r.budget.period]}` });
  if (r.maxItemPriceCents !== null)
    lines.push({ key: "item_price", kind: "limit", label: "Most per item", value: usd(r.maxItemPriceCents) });
  if (r.approvalItemThresholdCents !== null)
    lines.push({ key: "item_approval", kind: "ask", label: "Ask me for items over", value: usd(r.approvalItemThresholdCents) });
  if (r.approvalOrderThresholdCents !== null)
    lines.push({ key: "order_approval", kind: "ask", label: "Ask me for orders over", value: usd(r.approvalOrderThresholdCents) });
  if (r.maxQuantityPerItem !== null)
    lines.push({ key: "quantity", kind: "limit", label: "Most of any one item", value: String(r.maxQuantityPerItem) });
  if (r.allowedMerchants?.length)
    lines.push({ key: "allowed_merchants", kind: "limit", label: "Only from", value: r.allowedMerchants.join(", ") });
  if (r.blockedMerchants.length)
    lines.push({ key: "blocked_merchants", kind: "limit", label: "Never from", value: r.blockedMerchants.join(", ") });
  if (r.blockedCategories.length)
    lines.push({ key: "blocked_categories", kind: "limit", label: "Never buy", value: r.blockedCategories.join(", ") });
  lines.push(
    r.allowRecurring
      ? { key: "recurring", kind: "allow", label: "Subscriptions", value: "Allowed" }
      : { key: "recurring", kind: "limit", label: "Subscriptions", value: "Never" },
  );
  if (r.allowedHours)
    lines.push({
      key: "hours",
      kind: "limit",
      label: "Only between",
      value: `${pad(r.allowedHours.start)}:00–${pad(r.allowedHours.end)}:00 (${r.allowedHours.timezone})`,
    });
  if (r.expiresAt)
    lines.push({
      key: "expiry",
      kind: "limit",
      label: "Expires",
      value: new Date(r.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    });

  return lines;
}

const pad = (n: number) => String(n).padStart(2, "0");
