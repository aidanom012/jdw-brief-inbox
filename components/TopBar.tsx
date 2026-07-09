import Link from "next/link";
import type { UserRole } from "@/lib/auth";

type TopBarProps = {
  role: UserRole;
};

export function TopBar(_props: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-cyan-300/15 bg-ink/82 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/inbox" className="focus-ring group rounded-lg font-mono text-lg font-black tracking-tight text-white">
          <span className="text-cyan-200">JDW</span> Brief Builder
          <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-lime-300 shadow-[0_0_16px_rgba(190,242,100,.9)]" />
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/inbox" className="nav-chip focus-ring">
            Inbox
          </Link>
          <Link href="/new" className="nav-chip nav-chip-active focus-ring">
            New Brief
          </Link>
          <span className="hidden rounded-lg border border-lime-300/25 bg-lime-300/10 px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-lime-100 sm:inline-flex">
            Full access
          </span>
          <Link href="/logout" className="nav-chip focus-ring">
            Log out
          </Link>
        </nav>
      </div>
    </header>
  );
}
