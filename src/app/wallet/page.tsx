import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { connectWalletAction, disconnectWalletAction } from "@/app/actions";
import { Check, Warning } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { getActiveMandate, getActiveWallet } from "@/lib/data";
import { getDemoUser } from "@/lib/demo-user";

export const metadata: Metadata = { title: "Wallet" };

const banners = {
  connected: { tone: "allow", text: "PayPal wallet connected." },
  cancelled: { tone: "ask", text: "You cancelled on PayPal. Nothing was saved." },
  failed: { tone: "deny", text: "PayPal didn't save the wallet. Try again." },
  disconnect_failed: { tone: "deny", text: "Couldn't reach PayPal, so the wallet is still connected. Try again." },
  disconnected: { tone: "ask", text: "Wallet disconnected. Leash can no longer charge it, and your rules were switched off." },
} as const;

export default async function WalletPage({ searchParams }: PageProps<"/wallet">) {
  await connection();
  const { status } = await searchParams;
  const banner = typeof status === "string" && status in banners ? banners[status as keyof typeof banners] : null;

  const user = await getDemoUser();
  const [wallet, mandate] = await Promise.all([getActiveWallet(user.id), getActiveMandate(user.id)]);

  return (
    <div className="max-w-2xl">
      <p className="eyebrow">Wallet</p>
      <h1 className="display mt-3">{wallet ? "Your PayPal wallet" : "Connect PayPal"}</h1>

      {banner && (
        <p
          role="status"
          className={`mt-6 flex items-center gap-2 rounded-xl px-4 py-3 text-[0.95rem] ${
            banner.tone === "allow" ? "bg-allow-tint text-allow" : banner.tone === "ask" ? "bg-ask-tint text-ask" : "bg-deny-tint text-deny"
          }`}
        >
          {banner.tone === "allow" ? <Check width={16} height={16} /> : <Warning width={16} height={16} />}
          <span className="text-ink">{banner.text}</span>
        </p>
      )}

      {wallet ? (
        <>
          <dl className="mt-8 divide-y divide-line border-y border-line">
            <Row label="PayPal account" value={wallet.payerEmail ?? "Saved"} />
            <Row label="Connected" value={wallet.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
            <Row label="Protected by" value={mandate ? mandate.title : "No active rules yet"} />
          </dl>
          <p className="mt-6 max-w-prose text-ink-2">
            Leash charges this wallet only when a purchase passes your rules, or when you approve it yourself. The agent never sees
            your PayPal details.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {!mandate && (
              <Link href="/rules/new" className="btn btn-primary">
                Write your rules
              </Link>
            )}
            <form action={disconnectWalletAction}>
              <SubmitButton variant="ghost" pendingLabel="Disconnecting…">
                Disconnect wallet
              </SubmitButton>
            </form>
          </div>
        </>
      ) : (
        <>
          <p className="mt-6 max-w-prose text-[1.05rem] leading-relaxed text-ink-2">
            You&rsquo;ll log in to PayPal and agree to let Leash charge your account later, without you there for each purchase.
            That&rsquo;s what lets the agent shop. Your rules decide which charges happen; you can disconnect at any time.
          </p>
          <form action={connectWalletAction} className="mt-8">
            <SubmitButton pendingLabel="Opening PayPal…">Connect PayPal</SubmitButton>
          </form>
          <p className="mt-4 text-[0.85rem] text-ink-3">Sandbox: log in with your sandbox personal account.</p>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3.5">
      <dt className="text-ink-2">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
