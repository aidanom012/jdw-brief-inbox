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
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">Inbox</h1>
            <p className="mt-2 text-sm text-zinc-400">
              {activeStatus ? STATUS_LABELS[activeStatus] : "All campaign briefs"}
            </p>
          </div>
          <Link
            href="/new"
            className="focus-ring rounded-md bg-teal-300 px-4 py-3 font-semibold text-ink hover:bg-teal-200"
          >
            New Brief
          </Link>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((filter) => {
            const href = filter.status ? `/inbox?status=${filter.status}` : "/inbox";
            const isActive = filter.status === activeStatus || (!filter.status && !activeStatus);

            return (
              <Link
                key={filter.label}
                href={href}
                className={`focus-ring whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium ${
                  isActive
                    ? "border-teal-300/40 bg-teal-300/15 text-teal-100"
                    : "border-white/10 text-zinc-300 hover:bg-white/10"
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>

        {errorMessage ? (
          <section className="mt-6 rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-amber-100">
            {errorMessage}
          </section>
        ) : null}

        {!errorMessage && briefs.length === 0 ? (
          <section className="mt-8 rounded-lg border border-white/10 bg-panel p-8 text-center shadow-glow">
            <h2 className="text-xl font-semibold text-white">No briefs yet.</h2>
            <p className="mt-2 text-zinc-400">Paste a Claude campaign brief to get started.</p>
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
