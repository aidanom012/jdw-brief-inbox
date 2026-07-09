import Link from "next/link";
import type { UserRole } from "@/lib/auth";

type TopBarProps = {
  role: UserRole;
};

export function TopBar(_props: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b-4 border-[#201203] bg-[#fff0c2]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/inbox" className="focus-ring group border-4 border-[#201203] bg-[#ffcf4c] px-3 py-2 font-mono text-lg font-black uppercase tracking-tight text-[#201203] shadow-[4px_4px_0_#201203]">
          JDW Brief Builder
          <span className="ml-2 inline-block h-3 w-3 animate-pulse border-2 border-[#201203] bg-[#d9ff9a]" />
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/inbox" className="nav-chip focus-ring">Inbox</Link>
          <Link href="/new" className="nav-chip nav-chip-active focus-ring">New Brief</Link>
          <span className="hidden border-4 border-[#201203] bg-[#d9ff9a] px-3 py-2 font-mono text-xs font-black uppercase tracking-[0.14em] text-[#201203] shadow-[3px_3px_0_#201203] sm:inline-flex">
            One login
          </span>
          <Link href="/logout" className="nav-chip focus-ring">Log out</Link>
        </nav>
      </div>
    </header>
  );
}
