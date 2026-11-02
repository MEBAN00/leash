import Link from "next/link";
import { connection } from "next/server";
import { connectWalletAction } from "@/app/actions";
import { BudgetMeter } from "@/components/budget-meter";
import { Arrow, Check, Hand } from "@/components/icons";
import { Receipt } from "@/components/receipt";
import { RuleList } from "@/components/rule-list";
import { SubmitButton } from "@/components/submit-button";
import { TaskForm } from "@/components/task-form";
import { getActiveMandate, getActiveWallet, listPendingApprovals, listPurchases, listRuns, spentInPeriod } from "@/lib/data";
import { getDemoUser } from "@/lib/demo-user";
import { money, plural, timeAgo } from "@/lib/format";
import { describeRules } from "@/lib/policy/describe";

const periodLabel = { day: "today", week: "this week", month: "this month", total: "in total" } as const;

export default async function Overview() {
  await connection();
  const user = await getDemoUser();
  const [wallet, mandate] = await Promise.all([getActiveWallet(user.id), getActiveMandate(user.id)]);

  if (!wallet || !mandate) return <Setup hasWallet={!!wallet} />;

  const [paid, pending, purchases, runs] = await Promise.all([
    spentInPeriod(mandate.id, mandate.rules),
    listPendingApprovals(),
    listPurchases(3),
    listRuns(5),
  ]);
  const pendingCents = pending.filter((p) => p.mandateId === mandate.id).reduce((s, p) => s + p.totalCents, 0);

  return (
    <div className="grid gap-x-14 gap-y-12 lg:grid-cols-12">
      <section className="min-w-0 lg:col-span-7">
        <p className="eyebrow">Your agent is on a leash</p>
        <h1 className="display mt-3 max-w-[16ch] text-balance">{mandate.title}</h1>
        <div className="mt-9">
          <TaskForm />
        </div>

        {pending.length > 0 && (
          <Link
            href="/approvals"
            className="mt-10 flex items-center gap-3 rounded-2xl bg-ask-tint px-5 py-4 text-ink ring-1 ring-ask/25 transition-transform active:scale-[0.99]"
          >
            <Hand className="text-ask" width={18} height={18} />
            <span className="flex-1">
              <span className="font-semibold">{plural(pending.length, "purchase")} waiting for you</span>
              <span className="text-ink-2"> · {money(pending.reduce((s, p) => s + p.totalCents, 0))}</span>
            </span>
            <Arrow className="text-ink-2" />
          </Link>
        )}

        <h2 className="eyebrow mt-14">Recent tasks</h2>
        {runs.length === 0 ? (
          <p className="mt-3 max-w-prose text-ink-2">
            Nothing yet. Give the agent a task above and watch every search and decision as it happens.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {runs.map((r) => (
              <li key={r.id}>
                <Link href={`/runs/${r.id}`} className="group flex items-center gap-4 py-3.5">
                  <span className="min-w-0 flex-1 truncate group-hover:text-petrol">{r.task}</span>
                  {r.mode === "compromised" && <span className="text-[0.75rem] font-semibold text-deny">compromised</span>}
                  {r.status === "waiting_input" ? (
                    <span className="text-[0.85rem] font-semibold text-ask">Needs your answer</span>
                  ) : (
                    <span className="text-[0.85rem] text-ink-3">{r.status === "running" ? "Running…" : timeAgo(r.createdAt)}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="min-w-0 space-y-10 lg:col-span-5">
        {mandate.rules.budget && (
          <BudgetMeter
            budgetCents={mandate.rules.budget.amountCents}
            paidCents={paid}
            pendingCents={pendingCents}
            periodLabel={periodLabel[mandate.rules.budget.period]}
          />
        )}

        <div>
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow">Your rules</h2>
            <Link href={`/rules/${mandate.id}`} className="text-[0.85rem] font-semibold text-petrol hover:underline">
              Change
            </Link>
          </div>
          <div className="mt-2">
            <RuleList lines={describeRules(mandate.rules)} dense />
          </div>
        </div>

        {purchases.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="eyebrow">Latest receipt</h2>
              <Link href="/activity" className="text-[0.85rem] font-semibold text-petrol hover:underline">
                All activity
              </Link>
            </div>
            <div className="mt-3">
              <Receipt purchase={purchases[0]} />
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Setup({ hasWallet }: { hasWallet: boolean }) {
  const steps = [
    {
      title: "Connect your PayPal wallet",
      body: "Save your PayPal account once. Leash can then pay for what the agent buys, but only when your rules allow it.",
      done: hasWallet,
      action: (
        <form action={connectWalletAction}>
          <SubmitButton pendingLabel="Opening PayPal…">Connect PayPal</SubmitButton>
        </form>
      ),
    },
    {
      title: "Write your rules",
      body: "Say what the agent may buy and your limits, in your own words. You'll check every rule before it goes live.",
      done: false,
      action: (
        <Link href="/rules/new" className="btn btn-primary">
          Write rules
        </Link>
      ),
    },
    {
      title: "Give it a task",
      body: "The agent searches real stores and proposes carts. Your rules decide: pay, ask you, or refuse.",
      done: false,
      action: null,
    },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <section className="lg:col-span-6">
        <p className="eyebrow">Leash</p>
        <h1 className="display mt-3 text-balance">Let an AI shop for you. Keep it on a leash.</h1>
        <p className="mt-5 max-w-[46ch] text-[1.1rem] leading-relaxed text-ink-2">
          The agent never holds your wallet. It proposes purchases; rules you write decide whether they&rsquo;re paid, sent to you
          for approval, or refused.
        </p>
        <p className="mt-6 text-[0.85rem] text-ink-3">PayPal sandbox: no real money moves.</p>
      </section>

      <ol className="space-y-3 lg:col-span-6 lg:pt-6">
        {steps.map((s, i) => {
          const state = s.done ? "done" : i === current ? "current" : "later";
          return (
            <li
              key={s.title}
              className={`flex gap-4 rounded-2xl p-5 transition-colors ${state === "current" ? "bg-surface shadow-[var(--shadow-slip)]" : ""}`}
            >
              <span
                className={`num grid size-8 shrink-0 place-items-center rounded-full text-[0.9rem] font-bold ${
                  state === "done" ? "bg-allow text-surface" : state === "current" ? "bg-petrol text-surface" : "text-ink-3 ring-1 ring-line-strong"
                }`}
              >
                {state === "done" ? <Check strokeWidth={2.4} /> : i + 1}
              </span>
              <div className={state === "later" ? "opacity-55" : ""}>
                <h2 className="text-[1.1rem] font-semibold">{s.title}</h2>
                <p className="mt-1 text-ink-2">{s.body}</p>
                {state === "current" && s.action && <div className="mt-4">{s.action}</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
