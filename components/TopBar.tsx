import Link from "next/link";
import type { UserRole } from "@/lib/auth";

type TopBarProps = {
  role: UserRole;
};

export function TopBar(_props: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b-4 border-white bg-[#071013]/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/inbox" className="focus-ring border-4 border-white bg-white px-3 py-2 font-mono text-lg font-black uppercase tracking-tight text-[#071013] transition duration-150 hover:bg-[#eb5160] hover:text-white">
          JDW Brief Builder
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/inbox" className="nav-chip focus-ring">Inbox</Link>
          <Link href="/new" className="nav-chip focus-ring">New</Link>
          <Link href="/logout" className="nav-chip focus-ring">Log out</Link>
        </nav>
      </div>
    </header>
  );
}
