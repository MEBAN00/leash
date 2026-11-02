import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Check, Hand, Lock } from "@/components/icons";
import { RulesForm } from "@/components/rules-form";
import { getActiveWallet, getMandate } from "@/lib/data";
import { getDemoUser } from "@/lib/demo-user";

export const metadata: Metadata = { title: "Write rules" };

export default async function NewRules({ searchParams }: PageProps<"/rules/new">) {
  await connection();
  const { from } = await searchParams;
  const user = await getDemoUser();
  const [wallet, previous] = await Promise.all([
    getActiveWallet(user.id),
    typeof from === "string" ? getMandate(from) : undefined,
  ]);
  const defaultPrompt = previous && previous.userId === user.id ? previous.prompt : "";

  return (
    <div className="grid gap-x-14 gap-y-12 lg:grid-cols-12">
      <section className="lg:col-span-7">
        <p className="eyebrow">Rules</p>
        <h1 className="display mt-3 max-w-[18ch]">What is the agent allowed to do?</h1>
        <p className="mt-4 max-w-[52ch] text-[1.05rem] text-ink-2">
          Write it the way you&rsquo;d tell a person. Leash turns it into exact rules, and you check each one before it goes live.
        </p>
        {!wallet && (
          <p className="mt-6 rounded-xl bg-ask-tint px-4 py-3 text-[0.95rem]">
            Connect your PayPal wallet first.{" "}
            <Link href="/wallet" className="font-semibold text-petrol underline">
              Connect PayPal
            </Link>
          </p>
        )}
        <div className="mt-8">
          <RulesForm defaultPrompt={defaultPrompt} />
        </div>
      </section>

      <aside className="lg:col-span-5 lg:pt-24">
        <h2 className="eyebrow">How your rules are enforced</h2>
        <ul className="mt-4 space-y-5">
          <Legend Icon={Lock} tone="text-petrol" title="Hard limits are refused">
            Budgets, price caps, blocked stores. The agent can&rsquo;t get past these, even if you&rsquo;re not watching.
          </Legend>
          <Legend Icon={Hand} tone="text-ask" title="“Ask me” rules come to you">
            The purchase waits on your phone until you approve or decline it.
          </Legend>
          <Legend Icon={Check} tone="text-allow" title="Everything else is paid">
            Straight from your PayPal wallet, with a receipt explaining why it was allowed.
          </Legend>
        </ul>
        <p className="mt-8 border-t border-line pt-5 text-[0.9rem] text-ink-2">
          The rules are checked by plain code, not by the AI. A confused or manipulated agent can propose anything; it can&rsquo;t
          pay for it.
        </p>
      </aside>
    </div>
  );
}

function Legend({ Icon, tone, title, children }: { Icon: typeof Lock; tone: string; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <Icon className={`mt-1 shrink-0 ${tone}`} width={17} height={17} />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-[0.95rem] text-ink-2">{children}</p>
      </div>
    </li>
  );
}
