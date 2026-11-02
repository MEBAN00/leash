"use client";

import Link from "next/link";
import { useState } from "react";
import type { Purchase } from "@/db/schema";
import { clockTime, money } from "@/lib/format";
import type { Decision } from "@/lib/policy/types";
import { Check, Cross, Hand } from "./icons";
import { PurchaseActions } from "./purchase-actions";
import { Receipt } from "./receipt";

const mark: Record<Decision, { Icon: typeof Check; className: string; label: string }> = {
  ALLOW: { Icon: Check, className: "bg-allow-tint text-allow", label: "Allowed" },
  ASK: { Icon: Hand, className: "bg-ask-tint text-ask", label: "Asked you" },
  DENY: { Icon: Cross, className: "bg-deny-tint text-deny", label: "Refused" },
};

const statusText: Record<Purchase["status"], string> = {
  paid: "Paid",
  approved: "Paying…",
  pending_approval: "Waiting for you",
  denied: "Not charged",
  rejected: "Declined",
  failed: "Failed",
  refunded: "Refunded",
};

/** Purchases as a statement: grouped by day, one line each, unfolds into the full receipt. */
export function ReceiptLedger({ purchases }: { purchases: Purchase[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (purchases.length === 0) {
    return (
      <p className="max-w-[44ch] text-ink-2">
        No purchases yet. Give the agent a task, and every cart it proposes shows up here with the reason it was paid, held or
        refused.
      </p>
    );
  }

  const days = new Map<string, Purchase[]>();
  for (const p of purchases) {
    const key = dayLabel(p.createdAt);
    days.set(key, [...(days.get(key) ?? []), p]);
  }

  return (
    <div className="space-y-10">
      {[...days].map(([day, list]) => (
        <section key={day}>
          <h3 className="eyebrow mb-2">{day}</h3>
          <ul className="divide-y divide-line border-y border-line">
            {list.map((p) => (
              <Line key={p.id} purchase={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Line({ purchase: p, open, onToggle }: { purchase: Purchase; open: boolean; onToggle: () => void }) {
  const { Icon, className, label } = mark[p.decision];
  const items = p.cart.items;
  const first = items[0];
  const reason = p.checks.find((c) => c.outcome === "deny")?.reason ?? p.checks.find((c) => c.outcome === "ask")?.reason;
  const merchants = [...new Set(items.map((i) => i.merchantDomain))];
  const notCharged = p.status === "denied" || p.status === "rejected";

  return (
    <li>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="grid w-full grid-cols-[auto_1fr_auto] items-start gap-x-4 gap-y-1 py-4 text-left transition-colors hover:bg-paper-sunken/60 sm:px-2"
      >
        <span className={`mt-0.5 grid size-8 place-items-center rounded-full ${className}`} title={label}>
          <Icon width={15} height={15} strokeWidth={2.2} />
          <span className="sr-only">{label}</span>
        </span>

        <span className="min-w-0">
          <span className="flex items-center gap-3">
            <Thumbs urls={items.map((i) => i.imageUrl).filter((u): u is string => !!u).slice(0, 3)} />
            <span className="min-w-0">
              <span className="block truncate font-semibold">
                {first?.quantity > 1 && <span className="num">{first.quantity}× </span>}
                {first?.title}
              </span>
              <span className="block text-[0.85rem] text-ink-3">
                {items.length > 1 && `+ ${items.length - 1} more · `}
                {merchants.slice(0, 2).join(", ")}
                {merchants.length > 2 && ` +${merchants.length - 2}`} · {clockTime(p.createdAt)}
              </span>
            </span>
          </span>
          {reason && (
            <span className={`mt-2 block text-[0.9rem] leading-snug ${p.decision === "DENY" ? "text-deny" : "text-ask"}`}>
              {reason}
            </span>
          )}
        </span>

        <span className="text-right">
          <span className={`num block font-semibold ${notCharged ? "text-ink-3 line-through decoration-1" : ""}`}>{money(p.totalCents)}</span>
          <span className={`block text-[0.8rem] ${p.status === "pending_approval" ? "font-semibold text-ask" : "text-ink-3"}`}>
            {statusText[p.status]}
          </span>
        </span>
      </button>

      {/* Height animates via grid rows, so no layout measuring. */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out-quint)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          {open && (
            <div className="max-w-xl pb-6 pl-12">
              <Receipt purchase={p} showImages>
                {p.status === "paid" && <PurchaseActions purchaseId={p.id} status="paid" />}
              </Receipt>
              <Link href={`/runs/${p.runId}`} className="mt-2 inline-block text-[0.85rem] font-semibold text-petrol hover:underline">
                Open the agent&rsquo;s task
              </Link>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function Thumbs({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <span className="flex shrink-0 -space-x-3">
      {urls.map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- remote retailer images, any host
        <img key={i} src={u} alt="" loading="lazy" className="size-10 rounded-lg bg-paper-sunken object-cover ring-2 ring-paper" />
      ))}
    </span>
  );
}

function dayLabel(date: Date | string) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}
