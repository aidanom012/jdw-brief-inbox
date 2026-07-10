import Link from "next/link";
import { ArtistDesktop } from "@/components/ArtistDesktop";
import { BriefSearchList } from "@/components/BriefSearchList";
import { TopBar } from "@/components/TopBar";
import { getBriefs, type BriefRow } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isBriefStatus, STATUS_LABELS, type BriefStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

type InboxPageProps = {
  searchParams: {
    status?: string;
    artist?: string;
  };
};

const FILTERS: Array<{ label: string; status?: BriefStatus }> = [
  { label: "Draft", status: "received" },
  { label: "Completed", status: "done" }
];

function matchesArtist(brief: BriefRow, artist: string): boolean {
  return (brief.artist || "Unknown artist").trim().toLowerCase() === artist.trim().toLowerCase();
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const role = requireUser();
  const activeStatus: BriefStatus = searchParams.status && isBriefStatus(searchParams.status) ? searchParams.status : "received";
  const activeArtist = searchParams.artist?.trim() || "";
  let briefs: BriefRow[] = [];
  let allBriefs: BriefRow[] = [];
  let errorMessage: string | null = null;

  try {
    allBriefs = await getBriefs(activeStatus);
    briefs = activeArtist ? allBriefs.filter((brief) => matchesArtist(brief, activeArtist)) : allBriefs;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load briefs.";
  }

  return (
    <>
      <TopBar role={role} />
      <main className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6">
        <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="pixel-label">Campaign briefs</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">{activeArtist || "Brief inbox"}</h1>
            <p className="mt-3 text-sm font-semibold pixel-muted">
              {STATUS_LABELS[activeStatus]} · artist folders · clean funnel view
            </p>
          </div>
          <Link href="/new" className="pixel-button focus-ring px-5 py-4 text-sm">
            + New brief
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 pb-1">
          <Link href="/" className="nav-chip focus-ring">Desktop</Link>
          {FILTERS.map((filter) => {
            const params = new URLSearchParams();
            if (filter.status && filter.status !== "received") params.set("status", filter.status);
            if (activeArtist) params.set("artist", activeArtist);
            const href = params.toString() ? `/inbox?${params.toString()}` : "/inbox";
            const isActive = filter.status === activeStatus;
            return (
              <Link key={filter.label} href={href} className={`focus-ring whitespace-nowrap ${isActive ? "nav-chip nav-chip-active" : "nav-chip"}`}>
                {filter.label}
              </Link>
            );
          })}
          {activeArtist ? (
            <Link href="/inbox" className="nav-chip focus-ring">All folders</Link>
          ) : null}
        </div>

        {errorMessage ? (
          <section className="mt-6 pixel-alert p-4">
            {errorMessage}
          </section>
        ) : null}

        {!errorMessage && !activeArtist ? (
          <div className="mt-6">
            <ArtistDesktop briefs={allBriefs} />
          </div>
        ) : null}

        {!errorMessage && activeArtist && briefs.length === 0 ? (
          <section className="mt-8 pixel-window p-8 text-center">
            <p className="pixel-label">Empty folder</p>
            <h2 className="mt-2 text-2xl font-black">No {STATUS_LABELS[activeStatus].toLowerCase()} briefs for this artist.</h2>
            <p className="mt-2 font-semibold pixel-muted">Switch status or create a new brief.</p>
          </section>
        ) : null}

        {activeArtist && briefs.length > 0 ? (
          <div className="mt-6">
            <BriefSearchList briefs={briefs} />
          </div>
        ) : null}
      </main>
    </>
  );
}
