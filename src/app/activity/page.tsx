import type { Metadata } from "next";
import { connection } from "next/server";
import { ActivityGrids } from "@/components/activity-grids";
import { listAuditEvents, listPurchases } from "@/lib/data";
import { money } from "@/lib/format";

export const metadata: Metadata = { title: "Activity" };

export default async function Activity() {
  await connection();
  const [purchases, events] = await Promise.all([listPurchases(), listAuditEvents()]);
  const sum = (s: string) => purchases.filter((p) => p.status === s).reduce((t, p) => t + p.totalCents, 0);

  const figures = [
    { label: "Paid", value: sum("paid"), className: "text-ink" },
    { label: "Waiting for you", value: sum("pending_approval"), className: "text-ask" },
    { label: "Blocked by your rules", value: sum("denied"), className: "text-deny" },
    { label: "Refunded", value: sum("refunded"), className: "text-ink-2" },
  ];

  return (
    <div className="max-w-4xl">
      <p className="eyebrow">Activity</p>
      <h1 className="title mt-3">Every decision, with its reason</h1>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line sm:grid-cols-4">
        {figures.map((f) => (
          <div key={f.label} className="flex flex-col-reverse bg-surface px-5 py-4">
            <dt className="mt-0.5 text-[0.85rem] text-ink-2">{f.label}</dt>
            <dd className={`num text-[1.35rem] font-semibold tracking-tight ${f.value ? f.className : "text-ink-3"}`}>{money(f.value)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10">
        <ActivityGrids purchases={purchases} events={events} />
      </div>
    </div>
  );
}
