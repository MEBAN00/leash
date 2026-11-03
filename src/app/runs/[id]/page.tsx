import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BudgetMeter } from "@/components/budget-meter";
import { Warning } from "@/components/icons";
import { PhoneQr } from "@/components/phone-qr";
import { RuleList } from "@/components/rule-list";
import { RunReply } from "@/components/run-reply";
import { RunTimeline, type TimelineItem } from "@/components/run-timeline";
import { getMandate, getRun, listPurchasesForRun, listRunEvents, spentInPeriod } from "@/lib/data";
import { getDemoUser } from "@/lib/demo-user";
import { money } from "@/lib/format";
import { describeRules } from "@/lib/policy/describe";

export const metadata: Metadata = { title: "Agent task" };

const periodLabel = { day: "today", week: "this week", month: "this month", total: "in total" } as const;

export default async function RunPage({ params }: PageProps<"/runs/[id]">) {
  await connection();
  const { id } = await params;
  const user = await getDemoUser();
  const run = await getRun(id);
  const mandate = run && (await getMandate(run.mandateId));
  if (!run || !mandate || mandate.userId !== user.id) notFound();

  const [events, purchases, paid] = await Promise.all([
    listRunEvents(run.id),
    listPurchasesForRun(run.id),
    spentInPeriod(mandate.id, mandate.rules),
  ]);
  const byId = new Map(purchases.map((p) => [p.id, p]));

  const items: TimelineItem[] = [];
  let lastOptions: string[] = [];
  for (const e of events) {
    const p = e.payload as Record<string, unknown>;
    if (e.type === "agent.search") {
      items.push({ id: e.id, kind: "search", query: String(p.query), results: p.results as never });
    } else if (e.type === "purchase.proposed") {
      const purchase = byId.get(String(p.purchaseId));
      if (purchase) items.push({ id: e.id, kind: "receipt", purchase });
    } else if (e.type === "agent.question") {
      items.push({ id: e.id, kind: "question", question: String(p.question) });
      lastOptions = (p.options as string[]) ?? [];
    } else if (e.type === "person.reply") {
      items.push({ id: e.id, kind: "reply", text: String(p.text) });
    } else if (e.type === "run.finished" && p.summary) {
      items.push({ id: e.id, kind: "summary", text: String(p.summary) });
    } else if (e.type === "run.failed") {
      items.push({ id: e.id, kind: "error", text: String(p.error) });
    }
  }

  const tally = {
    paid: purchases.filter((p) => p.status === "paid").reduce((s, p) => s + p.totalCents, 0),
    waiting: purchases.filter((p) => p.status === "pending_approval"),
    refused: purchases.filter((p) => p.status === "denied").length,
  };

  return (
    <div className="grid gap-x-14 gap-y-10 lg:grid-cols-12">
      <section className="min-w-0 lg:col-span-8">
        <p className={`eyebrow ${run.status === "waiting_input" ? "text-ask" : ""}`}>
          {
            {
              running: "Agent at work",
              waiting_input: "Waiting for your answer",
              failed: "Task stopped",
              done: "Task finished",
            }[run.status]
          }
        </p>
        <h1 className="title mt-3 max-w-[30ch]">{run.task}</h1>
        <p className="num mt-3 text-[0.95rem] text-ink-2">
          {money(tally.paid)} paid · {tally.waiting.length} waiting for you · {tally.refused} refused
        </p>

        {run.mode === "compromised" && (
          <p className="mt-6 flex gap-2.5 rounded-xl bg-deny-tint px-4 py-3 text-[0.95rem]">
            <Warning className="mt-0.5 shrink-0 text-deny" width={16} height={16} />
            <span>
              <span className="font-semibold">Compromised agent simulation.</span> A product listing hides an instruction to buy 50,
              and this agent has been told to obey listings. Watch what your rules do.
            </span>
          </p>
        )}

        <div className="mt-10">
          <RunTimeline items={items} running={run.status === "running"} />
        </div>

        {run.status === "waiting_input" && (
          <div className="mt-6 pl-10">
            <RunReply runId={run.id} options={lastOptions} mode="answer" />
          </div>
        )}
        {(run.status === "done" || run.status === "failed") && (
          <div className="mt-12 max-w-xl border-t border-line pt-6">
            <h2 className="text-[0.95rem] font-semibold">Anything else?</h2>
            <p className="mt-0.5 mb-3 text-[0.9rem] text-ink-2">The agent remembers this task. Ask for more, or change the plan.</p>
            <RunReply runId={run.id} mode="followup" />
          </div>
        )}
      </section>

      <aside className="min-w-0 space-y-10 lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
        {mandate.rules.budget && (
          <BudgetMeter
            budgetCents={mandate.rules.budget.amountCents}
            paidCents={paid}
            pendingCents={tally.waiting.reduce((s, p) => s + p.totalCents, 0)}
            periodLabel={periodLabel[mandate.rules.budget.period]}
          />
        )}
        <div>
          <h2 className="eyebrow">Rules in force</h2>
          <div className="mt-2">
            <RuleList lines={describeRules(mandate.rules)} dense />
          </div>
        </div>
        <PhoneQr />
      </aside>
    </div>
  );
}
