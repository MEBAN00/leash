"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Overview" },
  { href: "/rules", label: "Rules" },
  { href: "/approvals", label: "Approvals" },
  { href: "/activity", label: "Activity" },
] as const;

export function NavLinks({ pending, variant }: { pending: number; variant: "top" | "bottom" }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" || pathname.startsWith("/runs") : pathname.startsWith(href));

  const badge = (href: string) =>
    href === "/approvals" && pending > 0 ? (
      <span className="num ml-1.5 inline-grid min-w-5 place-items-center rounded-full bg-ask px-1.5 text-[0.7rem] leading-5 font-bold text-surface">
        {pending}
      </span>
    ) : null;

  if (variant === "top") {
    return (
      <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={isActive(i.href) ? "page" : undefined}
            className="flex items-center rounded-full px-3 py-1.5 text-[0.92rem] text-ink-2 transition-colors hover:text-ink aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:shadow-[0_0_0_1px_var(--line)]"
          >
            {i.label}
            {badge(i.href)}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav
      className="material fixed inset-x-0 bottom-0 z-40 border-t border-line/70 pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Main"
    >
      <div className="grid grid-cols-4">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={isActive(i.href) ? "page" : undefined}
            className="flex h-14 items-center justify-center text-[0.8rem] font-medium text-ink-3 active:scale-95 aria-[current=page]:text-petrol"
          >
            {i.label}
            {badge(i.href)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
