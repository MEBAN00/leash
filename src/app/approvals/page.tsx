import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PhoneQr } from "@/components/phone-qr";
import { PurchaseActions } from "@/components/purchase-actions";
import { Receipt } from "@/components/receipt";
import { RunReply } from "@/components/run-reply";
import { listPendingApprovals, listWaitingRuns } from "@/lib/data";
import { money, plural } from "@/lib/format";

export const metadata: Metadata = { title: "Approvals" };

export default async function Approvals() {
  await connection();
  const [pending, questions] = await Promise.all([listPendingApprovals(), listWaitingRuns()]);
  const total = pending.reduce((s, p) => s + p.totalCents, 0);
  const count = pending.length + questions.length;

  return (
    <div className="mx-auto max-w-xl">
      <p className="eyebrow">Approvals</p>
      <h1 className="title mt-3">{count ? `${plural(count, "thing")} need${count === 1 ? "s" : ""} you` : "Nothing waiting"}</h1>
      {count === 0 && (
        <p className="mt-3 max-w-[44ch] text-ink-2">
          When the agent has a question, or wants something your rules say to ask about, it waits here. This page updates on its own.
        </p>
      )}

      {questions.length > 0 && (
        <section className="mt-8">
          <h2 className="eyebrow">{plural(questions.length, "question")} from the agent</h2>
          <ul className="mt-4 space-y-5">
            {questions.map(({ run, question }) => (
              <li key={run.id} className="rounded-2xl bg-surface p-5 shadow-[var(--shadow-slip)]">
                <Link href={`/runs/${run.id}`} className="text-[0.85rem] text-ink-3 hover:text-petrol">
                  {run.task}
                </Link>
                <p className="mt-1.5 mb-4 font-display text-[1.25rem] leading-snug">{question?.question ?? "The agent needs more information."}</p>
                <RunReply runId={run.id} options={question?.options} mode="answer" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow">
            {plural(pending.length, "purchase")} to approve · <span className="num">{money(total)}</span>
          </h2>
          <p className="mt-1 text-[0.9rem] text-ink-2">Nothing is charged until you approve.</p>
          <ul className="mt-5 space-y-8">
            {pending.map((p) => (
              <li key={p.id}>
                <Receipt purchase={p} showImages>
                  <PurchaseActions purchaseId={p.id} status={p.status} large />
                </Receipt>
                <Link href={`/runs/${p.runId}`} className="mt-2 inline-block text-[0.85rem] text-ink-3 hover:text-petrol">
                  See the agent&rsquo;s task
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {count === 0 && (
        <div className="mt-10 hidden md:block">
          <PhoneQr />
        </div>
      )}
    </div>
  );
}
