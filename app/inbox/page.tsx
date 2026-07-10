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
    allBriefs = await getBriefs(activeArtist ? activeStatus : undefined);
    briefs = activeArtist ? allBriefs.filter((brief) => matchesArtist(brief, activeArtist)) : allBriefs;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load briefs.";
  }

  return (
    <>
      <TopBar role={role} />
      <main className="mx-auto w-full max-w-[1540px] px-4 py-8 sm:px-6">
        {errorMessage ? (
          <section className="mt-6 pixel-alert p-4">
            {errorMessage}
          </section>
        ) : null}

        {!errorMessage && !activeArtist ? (
          <ArtistDesktop briefs={allBriefs} />
        ) : null}

        {!errorMessage && activeArtist ? (
          <section className="folder-campaign-screen animate-rise">
            <div className="desktop-titlebar" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="folder-campaign-header">
              <div>
                <p className="pixel-label">Artist workspace</p>
                <h1>{activeArtist}</h1>
                <p>{STATUS_LABELS[activeStatus]} campaigns for this artist.</p>
              </div>
              <div className="folder-campaign-actions">
                <Link href="/inbox" className="mini-button focus-ring">← Inbox</Link>
                <Link href="/new" className="pixel-button focus-ring">+ New brief</Link>
              </div>
            </div>

            <div className="folder-tabs" aria-label="Campaign filters">
              {FILTERS.map((filter) => {
                const params = new URLSearchParams();
                if (filter.status && filter.status !== "received") params.set("status", filter.status);
                params.set("artist", activeArtist);
                const href = `/inbox?${params.toString()}`;
                const isActive = filter.status === activeStatus;
                return (
                  <Link key={filter.label} href={href} className={`focus-ring ${isActive ? "nav-chip nav-chip-active" : "nav-chip"}`}>
                    {filter.label}
                  </Link>
                );
              })}
            </div>

            {briefs.length === 0 ? (
              <div className="empty-desktop-panel mt-6 text-center">
                <p className="pixel-label">Empty workspace</p>
                <h2>No {STATUS_LABELS[activeStatus].toLowerCase()} campaigns here.</h2>
                <p>Switch status or create a new brief.</p>
              </div>
            ) : (
              <div className="mt-6">
                <BriefSearchList briefs={briefs} />
              </div>
            )}
          </section>
        ) : null}
      </main>
    </>
  );
}
