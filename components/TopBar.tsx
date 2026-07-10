import Link from "next/link";
import type { UserRole } from "@/lib/auth";

type TopBarProps = {
  role: UserRole;
};

export function TopBar(_props: TopBarProps) {
  return (
    <header className="top-shell">
      <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Link href="/inbox" className="brand-mark focus-ring">
          JDW Brief Builder
        </Link>
        <nav className="top-nav flex items-center gap-2 text-sm">
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
