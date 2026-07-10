import Link from "next/link";
import type { UserRole } from "@/lib/auth";
import { ColorControlPanel } from "@/components/ColorControlPanel";

type TopBarProps = {
  role: UserRole;
};

export function TopBar(_props: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b-4 border-white bg-[var(--bg)]/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link
          href="/inbox"
          className="focus-ring border-4 border-white bg-white px-3 py-2 font-mono text-lg font-black uppercase tracking-tight text-black transition duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          JDW Brief Builder
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <ColorControlPanel />
          <Link href="/inbox" className="nav-chip focus-ring">
            Inbox
          </Link>
          <Link href="/new" className="nav-chip focus-ring">
            New
          </Link>
          <Link href="/logout" className="nav-chip focus-ring">
            Log out
          </Link>
        </nav>
      </div>
    </header>
  );
}
