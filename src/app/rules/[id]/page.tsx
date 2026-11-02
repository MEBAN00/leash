import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { activateRulesAction, revokeRulesAction } from "@/app/actions";
import { Check, Warning } from "@/components/icons";
import { RuleList } from "@/components/rule-list";
import { SubmitButton } from "@/components/submit-button";
import { getMandate } from "@/lib/data";
import { getDemoUser } from "@/lib/demo-user";
import { describeRules } from "@/lib/policy/describe";

export const metadata: Metadata = { title: "Review rules" };

export default async function ReviewRules({ params }: PageProps<"/rules/[id]">) {
  await connection();
  const { id } = await params;
  const user = await getDemoUser();
  const mandate = await getMandate(id);
  if (!mandate || mandate.userId !== user.id) notFound();

  const lines = describeRules(mandate.rules);
  const status = {
    draft: { eyebrow: "Check your rules", note: "Nothing is live yet. Activate when every line looks right." },
    active: {
      eyebrow: "Active rules",
      note: `Live since ${mandate.activatedAt?.toLocaleDateString("en-US", { month: "short", day: "numeric" }) ?? "today"}. Every purchase is checked against these.`,
    },
    revoked: { eyebrow: "Switched off", note: "These rules are no longer used. The agent can't shop until new rules are active." },
  }[mandate.status];

  return (
    <div className="grid gap-x-14 gap-y-10 lg:grid-cols-12">
      <section className="lg:col-span-5">
        <p className="eyebrow">{status.eyebrow}</p>
        <h1 className="title mt-3">{mandate.title}</h1>
        <figure className="mt-6">
          <blockquote className="font-display text-[1.25rem] leading-relaxed text-ink-2 italic">
            &ldquo;{mandate.prompt}&rdquo;
          </blockquote>
          <figcaption className="mt-2 text-[0.85rem] text-ink-3">What you wrote</figcaption>
        </figure>
      </section>

      <section className="lg:col-span-7">
        <div className="rounded-2xl bg-surface p-6 shadow-[var(--shadow-slip)] sm:p-8">
          <h2 className="eyebrow">What Leash will enforce</h2>
          <div className="mt-2">
            <RuleList lines={lines} />
          </div>

          {mandate.unenforced.length > 0 && (
            <div className="mt-6 rounded-xl bg-ask-tint px-4 py-3.5">
              <p className="flex items-center gap-2 font-semibold">
                <Warning className="text-ask" width={15} height={15} /> Leash can&rsquo;t enforce {mandate.unenforced.length === 1 ? "this" : "these"}
              </p>
              <ul className="mt-1.5 list-inside list-disc text-[0.95rem] text-ink-2">
                {mandate.unenforced.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
              <p className="mt-2 text-[0.9rem] text-ink-2">The agent will be told, but no rule stops it.</p>
            </div>
          )}

          <p className="mt-6 text-[0.95rem] text-ink-2">{status.note}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            {mandate.status === "draft" && (
              <form action={activateRulesAction.bind(null, mandate.id)}>
                <SubmitButton pendingLabel="Activating…">
                  <Check strokeWidth={2.2} /> Activate rules
                </SubmitButton>
              </form>
            )}
            <Link href={`/rules/new?from=${mandate.id}`} className="btn btn-ghost">
              {mandate.status === "draft" ? "Rewrite" : "Write new rules"}
            </Link>
            {mandate.status === "active" && (
              <form action={revokeRulesAction.bind(null, mandate.id)}>
                <SubmitButton variant="ghost" pendingLabel="Switching off…" className="text-deny">
                  Switch off
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
