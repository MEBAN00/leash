import { money } from "@/lib/format";

/** Paid, waiting-for-approval and remaining, on one bar. */
export function BudgetMeter({
  budgetCents,
  paidCents,
  pendingCents,
  periodLabel,
}: {
  budgetCents: number;
  paidCents: number;
  pendingCents: number;
  periodLabel: string;
}) {
  const pct = (c: number) => `${Math.min(100, (c / budgetCents) * 100)}%`;
  const remaining = Math.max(0, budgetCents - paidCents);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="num text-2xl font-semibold tracking-tight">
          {money(remaining)}
          <span className="ml-1.5 text-base font-normal text-ink-2">left</span>
        </p>
        <p className="num text-sm text-ink-3">
          of {money(budgetCents)} {periodLabel}
        </p>
      </div>
      <div
        className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-paper-sunken ring-1 ring-line ring-inset"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={budgetCents}
        aria-valuenow={paidCents}
        aria-label="Budget used"
      >
        <div className="h-full bg-petrol transition-[width] duration-700 ease-[var(--ease-out-quint)]" style={{ width: pct(paidCents) }} />
        <div
          className="h-full bg-[repeating-linear-gradient(-45deg,var(--ask)_0_3px,var(--ask-tint)_3px_6px)] transition-[width] duration-700"
          style={{ width: pct(pendingCents) }}
        />
      </div>
      <div className="mt-2 flex gap-4 text-[0.8rem] text-ink-2">
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-petrol" /> Paid <span className="num">{money(paidCents)}</span>
        </span>
        {pendingCents > 0 && (
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-full bg-ask" /> Waiting <span className="num">{money(pendingCents)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
