import Link from "next/link";
import type { UserRole } from "@/lib/auth";

type TopBarProps = {
  role: UserRole;
};

export function TopBar({ role }: TopBarProps) {
  return (
    <header className="border-b border-white/10 bg-ink/88 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/inbox" className="focus-ring rounded text-lg font-semibold tracking-wide text-white">
          {process.env.NEXT_PUBLIC_APP_NAME || "JDW Brief Inbox"}
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/inbox"
            className="focus-ring rounded-md border border-white/10 px-3 py-2 text-zinc-200 hover:bg-white/10"
          >
            Inbox
          </Link>
          <Link
            href="/new"
            className="focus-ring rounded-md border border-teal-300/30 bg-teal-300/12 px-3 py-2 font-medium text-teal-100 hover:bg-teal-300/20"
          >
            New Brief
          </Link>
          <span className="rounded-md border border-white/10 px-3 py-2 text-zinc-300">{role}</span>
          <Link
            href="/logout"
            className="focus-ring rounded-md border border-white/10 px-3 py-2 text-zinc-300 hover:bg-white/10"
          >
            Log out
          </Link>
        </nav>
      </div>
    </header>
  );
}
