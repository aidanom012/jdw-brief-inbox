import Link from "next/link";
import { BriefCard } from "@/components/BriefCard";
import { TopBar } from "@/components/TopBar";
import { getBriefs, type BriefRow } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isBriefStatus, STATUS_LABELS, type BriefStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

type InboxPageProps = {
  searchParams: {
    status?: string;
  };
};

const FILTERS: Array<{ label: string; status?: BriefStatus }> = [
  { label: "All" },
  { label: "Incomplete", status: "incomplete" },
  { label: "Ready", status: "ready_to_build" },
  { label: "Building", status: "building" },
  { label: "Needs James", status: "needs_james" },
  { label: "Done", status: "done" }
];

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const role = requireUser();
  const activeStatus = searchParams.status && isBriefStatus(searchParams.status) ? searchParams.status : undefined;
  let briefs: BriefRow[] = [];
  let errorMessage: string | null = null;

  try {
    briefs = await getBriefs(activeStatus);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load briefs.";
  }

  return (
    <>
      <TopBar role={role} />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">Campaign control</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Brief inbox</h1>
            <p className="mt-3 text-sm text-zinc-400">
              {activeStatus ? STATUS_LABELS[activeStatus] : "All campaign briefs"} · single login · full access
            </p>
          </div>
          <Link href="/new" className="pixel-button focus-ring px-5 py-4 text-sm">
            + New brief
          </Link>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((filter) => {
            const href = filter.status ? `/inbox?status=${filter.status}` : "/inbox";
            const isActive = filter.status === activeStatus || (!filter.status && !activeStatus);

            return (
              <Link key={filter.label} href={href} className={`focus-ring whitespace-nowrap ${isActive ? "nav-chip nav-chip-active" : "nav-chip"}`}>
                {filter.label}
              </Link>
            );
          })}
        </div>

        {errorMessage ? (
          <section className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100">
            {errorMessage}
          </section>
        ) : null}

        {!errorMessage && briefs.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-white/10 bg-panel/80 p-8 text-center shadow-neon backdrop-blur-xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">Empty</p>
            <h2 className="mt-2 text-2xl font-black text-white">No briefs yet.</h2>
            <p className="mt-2 text-zinc-400">Create one with the three-step builder.</p>
          </section>
        ) : null}

        {briefs.length > 0 ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {briefs.map((brief) => (
              <BriefCard key={brief.id} brief={brief} />
            ))}
          </div>
        ) : null}
      </main>
    </>
  );
}
