import type {
  Cart,
  Decision,
  PolicyCheck,
  PolicyContext,
  PolicyResult,
  PolicyRules,
} from "./types";

/**
 * The policy engine. Deterministic, no LLM, no I/O. The agent can only
 * propose a cart; this decides whether it is paid, needs approval, or refused.
 */
export function evaluate(rules: PolicyRules, cart: Cart, ctx: PolicyContext): PolicyResult {
  const checks: PolicyCheck[] = [];
  const add = (rule: string, outcome: PolicyCheck["outcome"], reason: string) =>
    checks.push({ rule, outcome, reason });

  const totalCents = cart.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);

  // Sanity: malformed carts are refused outright.
  if (cart.items.length === 0) add("cart", "deny", "Cart is empty.");
  for (const item of cart.items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1)
      add("cart", "deny", `"${item.title}" has invalid quantity ${item.quantity}.`);
    if (!Number.isInteger(item.unitPriceCents) || item.unitPriceCents < 0)
      add("cart", "deny", `"${item.title}" has an invalid price.`);
    if (item.currency !== rules.currency)
      add("cart", "deny", `"${item.title}" is priced in ${item.currency}, mandate allows ${rules.currency} only.`);
  }

  if (rules.expiresAt && ctx.now >= new Date(rules.expiresAt)) {
    add("expiry", "deny", `Mandate expired at ${rules.expiresAt}.`);
  }

  if (rules.allowedHours) {
    const { start, end, timezone } = rules.allowedHours;
    const hour = localHour(ctx.now, timezone);
    const inWindow = start <= end ? hour >= start && hour < end : hour >= start || hour < end;
    add(
      "hours",
      inWindow ? "pass" : "deny",
      inWindow
        ? `Within allowed hours (${start}:00–${end}:00 ${timezone}).`
        : `Outside allowed hours: it's ${hour}:00 in ${timezone}, allowed ${start}:00–${end}:00.`,
    );
  }

  for (const item of cart.items) {
    const domain = normalizeDomain(item.merchantDomain);

    if (rules.blockedMerchants.some((m) => domainMatches(domain, m))) {
      add("merchant", "deny", `${domain} is on your blocked list ("${item.title}").`);
    } else if (rules.allowedMerchants && !rules.allowedMerchants.some((m) => domainMatches(domain, m))) {
      add("merchant", "deny", `${domain} isn't on your allowed merchants list ("${item.title}").`);
    }

    // Category match is a hard deny. A keyword in the title alone is fuzzy
    // ("Non-alcoholic punch"), so that only asks the user.
    const category = item.category?.toLowerCase() ?? "";
    const title = item.title.toLowerCase();
    for (const c of rules.blockedCategories.map((c) => c.toLowerCase()).filter(Boolean)) {
      if (category.includes(c)) {
        add("category", "deny", `"${item.title}" is in blocked category "${c}".`);
      } else if (title.includes(c)) {
        add("category", "ask", `"${item.title}" might be in blocked category "${c}".`);
      }
    }

    if (item.recurring && !rules.allowRecurring)
      add("recurring", "deny", `"${item.title}" is a recurring charge; your mandate doesn't allow those.`);

    if (rules.maxQuantityPerItem !== null && item.quantity > rules.maxQuantityPerItem)
      add("quantity", "deny", `Quantity ${item.quantity} of "${item.title}" exceeds your max of ${rules.maxQuantityPerItem}.`);

    if (rules.maxItemPriceCents !== null && item.unitPriceCents > rules.maxItemPriceCents) {
      add("item_price", "deny", `"${item.title}" costs ${usd(item.unitPriceCents)}, over your hard cap of ${usd(rules.maxItemPriceCents)}.`);
    } else if (
      rules.approvalItemThresholdCents !== null &&
      item.unitPriceCents > rules.approvalItemThresholdCents
    ) {
      add("item_approval", "ask", `"${item.title}" costs ${usd(item.unitPriceCents)}, over your ${usd(rules.approvalItemThresholdCents)} ask-me threshold.`);
    }
  }

  if (rules.budget) {
    const remaining = rules.budget.amountCents - ctx.spentInPeriodCents;
    const label = rules.budget.period === "total" ? "total budget" : `${rules.budget.period}ly budget`;
    if (totalCents > remaining) {
      add("budget", "deny", `Order is ${usd(totalCents)} but only ${usd(Math.max(remaining, 0))} is left of your ${usd(rules.budget.amountCents)} ${label}.`);
    } else {
      add("budget", "pass", `${usd(totalCents)} fits; ${usd(remaining - totalCents)} of ${label} left after this.`);
    }
  }

  if (rules.approvalOrderThresholdCents !== null && totalCents > rules.approvalOrderThresholdCents) {
    add("order_approval", "ask", `Order total ${usd(totalCents)} is over your ${usd(rules.approvalOrderThresholdCents)} ask-me threshold.`);
  }

  return { decision: combine(checks), totalCents, checks };
}

function combine(checks: PolicyCheck[]): Decision {
  if (checks.some((c) => c.outcome === "deny")) return "DENY";
  if (checks.some((c) => c.outcome === "ask")) return "ASK";
  return "ALLOW";
}

/** Start of the budget period containing `now` (UTC), or null for "total". */
export function periodStart(period: NonNullable<PolicyRules["budget"]>["period"], now: Date): Date | null {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  switch (period) {
    case "day":
      return d;
    case "week": // Monday-based weeks
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      return d;
    case "month":
      d.setUTCDate(1);
      return d;
    case "total":
      return null;
  }
}

export function normalizeDomain(input: string): string {
  let s = input.trim().toLowerCase();
  try {
    if (s.includes("://")) s = new URL(s).hostname;
  } catch {
    // not a URL, use as-is
  }
  return s.replace(/^www\./, "").replace(/\/.*$/, "");
}

/** shop.target.com matches target.com; nottarget.com does not. */
function domainMatches(domain: string, rule: string): boolean {
  const r = normalizeDomain(rule);
  return domain === r || domain.endsWith(`.${r}`);
}

function localHour(now: Date, timezone: string): number {
  const h = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: timezone }).format(now);
  return Number(h);
}

export function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
