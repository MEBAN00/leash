"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { Purchase } from "@/db/schema";
import { money } from "@/lib/format";
import { Search, Warning } from "./icons";
import { PurchaseActions } from "./purchase-actions";
import { Receipt } from "./receipt";

export type TimelineItem =
  | { id: string; kind: "search"; query: string; results: SearchResult[] }
  | { id: string; kind: "receipt"; purchase: Purchase }
  | { id: string; kind: "question"; question: string }
  | { id: string; kind: "reply"; text: string }
  | { id: string; kind: "summary"; text: string }
  | { id: string; kind: "error"; text: string };

type SearchResult = { id: string; title: string; priceCents: number; merchant: string; imageUrl: string | null; injected?: boolean };

export function RunTimeline({ items, running }: { items: TimelineItem[]; running: boolean }) {
  const reduce = useReducedMotion();
  // Items present on first render are history; anything after that just happened.
  const [history] = useState(() => new Set(items.map((i) => i.id)));

  return (
    <ol className="relative space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[0.7rem] before:w-px before:bg-line">
      <AnimatePresence initial={false}>
        {items.map((item) => {
          const fresh = !history.has(item.id);
          return (
            <motion.li
              key={item.id}
              layout={!reduce}
              initial={fresh && !reduce ? { opacity: 0, y: 10 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.5 }}
              className="relative pl-10"
            >
              <Dot kind={item.kind} />
              <Entry item={item} fresh={fresh} />
            </motion.li>
          );
        })}
      </AnimatePresence>
      {running && (
        <li className="relative pl-10" aria-live="polite">
          <span className="absolute top-1.5 left-1.5 size-3 animate-ping rounded-full bg-petrol/40" />
          <span className="absolute top-1.5 left-1.5 size-3 rounded-full bg-petrol" />
          <p className="text-ink-2">The agent is working…</p>
        </li>
      )}
    </ol>
  );
}

function Dot({ kind }: { kind: TimelineItem["kind"] }) {
  const color = {
    error: "bg-deny",
    summary: "bg-allow",
    receipt: "bg-ink",
    question: "bg-ask",
    reply: "bg-petrol",
    search: "bg-line-strong",
  }[kind];
  return <span className={`absolute top-1.5 left-1.5 size-3 rounded-full ring-4 ring-paper ${color}`} />;
}

function Entry({ item, fresh }: { item: TimelineItem; fresh: boolean }) {
  switch (item.kind) {
    case "search":
      return (
        <div>
          <p className="flex items-center gap-2 text-[0.95rem] text-ink-2">
            <Search width={14} height={14} /> Searched <span className="font-semibold text-ink">&ldquo;{item.query}&rdquo;</span>
            <span className="text-ink-3">· {item.results.length} results</span>
          </p>
          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
            {item.results.map((r) => (
              <div
                key={r.id}
                className={`w-32 shrink-0 rounded-lg bg-surface p-2 ring-1 ${r.injected ? "ring-2 ring-deny" : "ring-line"}`}
                title={r.title}
              >
                {r.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote retailer images, any host
                  <img src={r.imageUrl} alt="" loading="lazy" className="aspect-square w-full rounded-md bg-paper-sunken object-cover" />
                ) : (
                  <div className="aspect-square w-full rounded-md bg-paper-sunken" />
                )}
                <p className="mt-1.5 line-clamp-2 text-[0.75rem] leading-snug">{r.title}</p>
                <p className="num mt-0.5 text-[0.75rem] font-semibold">{money(r.priceCents)}</p>
                {r.injected && (
                  <p className="mt-1 flex items-center gap-1 text-[0.7rem] font-semibold text-deny">
                    <Warning width={11} height={11} /> Hidden instruction
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    case "receipt":
      return (
        <div className="max-w-xl">
          <Receipt purchase={item.purchase} fresh={fresh}>
            {(item.purchase.status === "pending_approval" || item.purchase.status === "paid") && (
              <PurchaseActions purchaseId={item.purchase.id} status={item.purchase.status} />
            )}
          </Receipt>
        </div>
      );
    case "question":
      return (
        <div className="max-w-xl">
          <p className="eyebrow text-ask">The agent asks</p>
          <p className="mt-1.5 font-display text-[1.3rem] leading-snug">{item.question}</p>
        </div>
      );
    case "reply":
      return (
        <div className="max-w-xl">
          <p className="eyebrow">You replied</p>
          <p className="mt-1.5 inline-block rounded-2xl rounded-tl-sm bg-petrol-tint px-4 py-2.5">{item.text}</p>
        </div>
      );
    case "summary":
      return (
        <div className="max-w-xl">
          <p className="eyebrow">Agent&rsquo;s summary</p>
          <p className="mt-2 leading-relaxed whitespace-pre-line">{item.text.replace(/\*\*/g, "")}</p>
        </div>
      );
    case "error":
      return (
        <div className="max-w-xl">
          <p className="eyebrow text-deny">The agent stopped</p>
          <p className="mt-2 text-ink-2">{item.text}</p>
        </div>
      );
  }
}
