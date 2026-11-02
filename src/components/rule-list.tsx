import type { RuleLine } from "@/lib/policy/describe";
import { Check, Hand, Lock } from "./icons";

const kinds = {
  limit: { Icon: Lock, className: "text-petrol", hint: "Hard limit: refused" },
  ask: { Icon: Hand, className: "text-ask", hint: "Needs your approval" },
  allow: { Icon: Check, className: "text-allow", hint: "Allowed" },
} as const;

/** The compiled mandate, one rule per line, label left and value right. */
export function RuleList({ lines, dense = false }: { lines: RuleLine[]; dense?: boolean }) {
  return (
    <dl className="divide-y divide-line">
      {lines.map((l) => {
        const { Icon, className, hint } = kinds[l.kind];
        return (
          <div key={l.key} className={`flex items-baseline gap-3 ${dense ? "py-2" : "py-3"}`}>
            <span className={`translate-y-[0.15rem] ${className}`} title={hint}>
              <Icon width={15} height={15} />
              <span className="sr-only">{hint}</span>
            </span>
            <dt className="flex-1 text-ink-2">{l.label}</dt>
            <dd className="num text-right font-semibold">{l.value}</dd>
          </div>
        );
      })}
    </dl>
  );
}
