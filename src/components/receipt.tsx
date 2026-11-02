"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import type { Purchase } from "@/db/schema";
import { clockTime, money } from "@/lib/format";
import { Check, Cross, Hand, Warning } from "./icons";
import { Stamp } from "./stamp";

const statusLine: Record<Purchase["status"], { text: string; className: string }> = {
  paid: { text: "Paid from your PayPal wallet", className: "text-allow" },
  approved: { text: "Approved, paying now…", className: "text-ink-2" },
  pending_approval: { text: "Waiting for your approval", className: "text-ask" },
  denied: { text: "Refused by your rules. Nothing was charged.", className: "text-deny" },
  rejected: { text: "Declined by you. Nothing was charged.", className: "text-ink-2" },
  failed: { text: "Payment failed", className: "text-deny" },
  refunded: { text: "Refunded to your PayPal wallet", className: "text-ink-2" },
};

const outcomeIcon = { ask: Hand, deny: Cross, pass: Check } as const;

export function Receipt({
  purchase,
  fresh = false,
  showImages = false,
  children,
}: {
  purchase: Purchase;
  /** Play the "printing" entrance (for receipts that just arrived). */
  fresh?: boolean;
  showImages?: boolean;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const play = fresh && !reduce;
  const flagged = purchase.checks.filter((c) => c.outcome !== "pass");
  const status = statusLine[purchase.status];

  return (
    <motion.article
      initial={play ? { clipPath: "inset(0 0 100% 0)", y: -6 } : false}
      animate={{ clipPath: "inset(0 0 0% 0)", y: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.7 }}
      className="slip w-full px-5 pt-4 pb-7 sm:px-6"
      aria-label={`Purchase ${money(purchase.totalCents)}: ${status.text}`}
    >
      <header className="flex items-center justify-between gap-3">
        <p className="eyebrow">Receipt · {clockTime(purchase.createdAt)}</p>
        <Stamp decision={purchase.decision} animate={play} />
      </header>
      {purchase.rationale && <p className="mt-2 text-[0.95rem] text-ink-2">{purchase.rationale}</p>}

      <ul className="mt-4 space-y-2.5 border-t border-dashed border-line-strong pt-4">
        {purchase.cart.items.map((item, i) => (
          <li key={`${item.productId}-${i}`} className="flex items-start gap-3">
            {showImages && item.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- remote retailer images, any host
              <img src={item.imageUrl} alt="" className="size-14 shrink-0 rounded-md bg-paper-sunken object-cover" loading="lazy" />
            )}
            <div className="min-w-0 flex-1">
              <p className="leading-snug">{item.title}</p>
              <p className="mt-0.5 font-mono text-[0.78rem] text-ink-3">
                {item.merchantDomain} · {item.quantity} × {money(item.unitPriceCents)}
              </p>
            </div>
            <p className="num font-mono text-[0.9rem]">{money(item.unitPriceCents * item.quantity)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-baseline justify-between border-t border-dashed border-line-strong pt-3 font-mono">
        <span className="text-[0.8rem] tracking-[0.08em] text-ink-2 uppercase">Total</span>
        <span className="num text-lg font-medium">{money(purchase.totalCents)}</span>
      </div>

      {flagged.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {flagged.map((c, i) => {
            const Icon = outcomeIcon[c.outcome];
            return (
              <li key={i} className={`flex gap-2 text-[0.9rem] leading-snug ${c.outcome === "deny" ? "text-deny" : "text-ask"}`}>
                <Icon className="mt-[0.2rem] shrink-0" width={14} height={14} strokeWidth={2} />
                <span className="text-ink">{c.reason}</span>
              </li>
            );
          })}
        </ul>
      )}

      <p className={`mt-4 flex items-center gap-1.5 text-[0.85rem] font-semibold ${status.className}`}>
        {purchase.status === "failed" && <Warning width={14} height={14} />}
        {status.text}
        {purchase.status === "failed" && purchase.failureReason && (
          <span className="font-normal text-ink-2">: {purchase.failureReason}</span>
        )}
      </p>
      {purchase.paypalOrderId && (
        <p className="mt-0.5 font-mono text-[0.75rem] text-ink-3">PayPal order {purchase.paypalOrderId}</p>
      )}

      {children && <div className="mt-5 flex flex-wrap gap-2">{children}</div>}
    </motion.article>
  );
}
