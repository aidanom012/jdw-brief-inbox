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
  { label: "Draft", status: "received" },
  { label: "Completed", status: "done" }
];

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const role = requireUser();
  const activeStatus: BriefStatus = searchParams.status && isBriefStatus(searchParams.status) ? searchParams.status : "received";
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
        <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="pixel-label">Campaign briefs</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">Brief inbox</h1>
            <p className="mt-3 text-sm font-semibold pixel-muted">
              {STATUS_LABELS[activeStatus]} · one login · clean funnel view
            </p>
          </div>
          <Link href="/new" className="pixel-button focus-ring px-5 py-4 text-sm">
            + New brief
          </Link>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((filter) => {
            const href = filter.status === "received" ? "/inbox" : `/inbox?status=${filter.status}`;
            const isActive = filter.status === activeStatus;
            return (
              <Link key={filter.label} href={href} className={`focus-ring whitespace-nowrap ${isActive ? "nav-chip nav-chip-active" : "nav-chip"}`}>
                {filter.label}
              </Link>
            );
          })}
        </div>

        {errorMessage ? (
          <section className="mt-6 pixel-alert p-4">
            {errorMessage}
          </section>
        ) : null}

        {!errorMessage && briefs.length === 0 ? (
          <section className="mt-8 pixel-window p-8 text-center">
            <p className="pixel-label">Empty</p>
            <h2 className="mt-2 text-2xl font-black">No briefs yet.</h2>
            <p className="mt-2 font-semibold pixel-muted">Create one with the campaign → ad sets → ads flow.</p>
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
