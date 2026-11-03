import Link from "next/link";
import { connection } from "next/server";
import { countByStatus, countWaitingRuns, getActiveWallet } from "@/lib/data";
import { getDemoUser } from "@/lib/demo-user";
import { Mark } from "./icons";
import { LiveRefresh } from "./live-refresh";
import { NavLinks } from "./nav-links";

export async function Nav() {
  await connection();
  const user = await getDemoUser();
  const [purchases, questions, wallet] = await Promise.all([
    countByStatus(["pending_approval"]),
    countWaitingRuns(),
    getActiveWallet(user.id),
  ]);
  const pending = purchases + questions;

  return (
    <>
      <header className="material sticky top-0 z-40 border-b border-line/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2 text-petrol" aria-label="Leash home">
            <Mark />
            <span className="font-display text-[1.35rem] leading-none tracking-[-0.01em] text-ink">Leash</span>
          </Link>
          <NavLinks pending={pending} variant="top" />
          <Link
            href="/wallet"
            className="ml-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.85rem] text-ink-2 ring-1 ring-line hover:bg-paper-sunken"
          >
            <i className={`size-2 rounded-full ${wallet ? "bg-allow" : "bg-line-strong"}`} />
            {wallet ? "PayPal connected" : "Connect PayPal"}
          </Link>
        </div>
      </header>
      <NavLinks pending={pending} variant="bottom" />
      <LiveRefresh />
    </>
  );
}
