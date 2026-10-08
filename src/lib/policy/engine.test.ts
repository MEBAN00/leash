import { describe, expect, it } from "vitest";
import { evaluate, normalizeDomain, periodStart } from "./engine";
import { item, partyMandate as rules } from "./fixtures";
import type { PolicyRules } from "./types";

const ctx = { now: new Date("2026-10-06T15:00:00Z"), spentInPeriodCents: 0 };

describe("evaluate", () => {
  it("allows a small in-policy cart", () => {
    const r = evaluate(rules, { items: [item(), item({ productId: "p2", quantity: 12 })] }, ctx);
    expect(r.decision).toBe("ALLOW");
    expect(r.totalCents).toBe(1299 * 13);
  });

  it("asks for approval for an item over the threshold (the bouncy castle)", () => {
    const r = evaluate(rules, { items: [item({ title: "Bouncy castle rental", unitPriceCents: 6000 })] }, ctx);
    expect(r.decision).toBe("ASK");
    expect(r.checks.find((c) => c.outcome === "ask")?.reason).toMatch(/\$60\.00.*\$40\.00/);
  });

  it("denies quantity over the max (the prompt-injection attack)", () => {
    const r = evaluate(rules, { items: [item({ quantity: 50 })] }, ctx);
    expect(r.decision).toBe("DENY");
    expect(r.checks.some((c) => c.rule === "quantity" && c.outcome === "deny")).toBe(true);
  });

  it("deny beats ask", () => {
    const r = evaluate(rules, { items: [item({ unitPriceCents: 6000 }), item({ quantity: 50 })] }, ctx);
    expect(r.decision).toBe("DENY");
  });

  it("denies when the budget would be exceeded, counting prior spend", () => {
    const r = evaluate(rules, { items: [item({ unitPriceCents: 3000 })] }, { ...ctx, spentInPeriodCents: 23000 });
    expect(r.decision).toBe("DENY");
    expect(r.checks.find((c) => c.rule === "budget")?.reason).toMatch(/only \$20\.00 is left/);
  });

  it("blocks merchants including subdomains, but not lookalikes", () => {
    expect(evaluate(rules, { items: [item({ merchantDomain: "https://www.amazon.com/dp/123" })] }, ctx).decision).toBe("DENY");
    expect(evaluate(rules, { items: [item({ merchantDomain: "smile.amazon.com" })] }, ctx).decision).toBe("DENY");
    expect(evaluate(rules, { items: [item({ merchantDomain: "notamazon.com" })] }, ctx).decision).toBe("ALLOW");
  });

  it("enforces an allowlist when set", () => {
    const r: PolicyRules = { ...rules, allowedMerchants: ["target.com"] };
    expect(evaluate(r, { items: [item({ merchantDomain: "target.com" })] }, ctx).decision).toBe("ALLOW");
    expect(evaluate(r, { items: [item({ merchantDomain: "walmart.com" })] }, ctx).decision).toBe("DENY");
  });

  it("denies recurring charges unless allowed", () => {
    const cart = { items: [item({ title: "Party Box monthly", recurring: true })] };
    expect(evaluate(rules, cart, ctx).decision).toBe("DENY");
    expect(evaluate({ ...rules, allowRecurring: true }, cart, ctx).decision).toBe("ALLOW");
  });

  it("denies blocked categories, and asks when only the title matches", () => {
    const r: PolicyRules = { ...rules, blockedCategories: ["alcohol"] };
    expect(evaluate(r, { items: [item({ category: "Alcohol & Spirits" })] }, ctx).decision).toBe("DENY");
    expect(evaluate(r, { items: [item({ title: "Non-alcoholic punch", category: "drinks" })] }, ctx).decision).toBe("ASK");
  });

  it("enforces a hard max item price", () => {
    const r: PolicyRules = { ...rules, maxItemPriceCents: 10000 };
    expect(evaluate(r, { items: [item({ unitPriceCents: 15000 })] }, ctx).decision).toBe("DENY");
  });

  it("asks when the order total is over the order threshold", () => {
    const r: PolicyRules = { ...rules, approvalOrderThresholdCents: 5000 };
    expect(evaluate(r, { items: [item({ quantity: 5 })] }, ctx).decision).toBe("ASK");
  });

  it("enforces allowed hours, including windows that wrap midnight", () => {
    const day: PolicyRules = { ...rules, allowedHours: { start: 9, end: 21, timezone: "America/New_York" } };
    // 15:00Z = 11:00 in New York
    expect(evaluate(day, { items: [item()] }, ctx).decision).toBe("ALLOW");
    const night: PolicyRules = { ...rules, allowedHours: { start: 22, end: 6, timezone: "America/New_York" } };
    expect(evaluate(night, { items: [item()] }, ctx).decision).toBe("DENY");
    expect(evaluate(night, { items: [item()] }, { ...ctx, now: new Date("2026-10-07T03:00:00Z") }).decision).toBe("ALLOW");
  });

  it("denies after the mandate expires", () => {
    const r: PolicyRules = { ...rules, expiresAt: "2026-10-01T00:00:00Z" };
    expect(evaluate(r, { items: [item()] }, ctx).decision).toBe("DENY");
  });

  it("denies malformed carts", () => {
    expect(evaluate(rules, { items: [] }, ctx).decision).toBe("DENY");
    expect(evaluate(rules, { items: [item({ quantity: 0 })] }, ctx).decision).toBe("DENY");
    expect(evaluate(rules, { items: [item({ unitPriceCents: -100 })] }, ctx).decision).toBe("DENY");
    expect(evaluate(rules, { items: [item({ currency: "EUR" })] }, ctx).decision).toBe("DENY");
  });
});

describe("helpers", () => {
  it("normalizes domains", () => {
    expect(normalizeDomain("https://WWW.Target.com/p/123")).toBe("target.com");
    expect(normalizeDomain("www.etsy.com/listing/1")).toBe("etsy.com");
  });

  it("computes period starts in UTC", () => {
    const now = new Date("2026-10-08T12:00:00Z"); // a Thursday
    expect(periodStart("day", now)?.toISOString()).toBe("2026-10-08T00:00:00.000Z");
    expect(periodStart("week", now)?.toISOString()).toBe("2026-10-05T00:00:00.000Z");
    expect(periodStart("month", now)?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(periodStart("total", now)).toBeNull();
  });
});
