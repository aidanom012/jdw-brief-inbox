import Link from "next/link";
import type { BriefRow } from "@/lib/db";
import { DeleteArtistFolderButton } from "@/components/DeleteArtistFolderButton";

type ArtistGroup = {
  artist: string;
  briefs: BriefRow[];
  latestBrief: BriefRow;
  latestRelease: string;
  draftCount: number;
  completedCount: number;
  readyCount: number;
  platforms: string[];
};

function artistName(value: string | null | undefined): string {
  const clean = value?.trim();
  return clean || "Unknown artist";
}

function newestBrief(briefs: BriefRow[]): BriefRow {
  return [...briefs].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
}

function formatUpdated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function platformBadges(briefs: BriefRow[]): string[] {
  return Array.from(
    new Set(
      briefs
        .map((brief) => brief.platform?.trim())
        .filter((platform): platform is string => Boolean(platform))
    )
  ).slice(0, 4);
}

function groupBriefs(briefs: BriefRow[]): ArtistGroup[] {
  return Array.from(
    briefs.reduce((map, brief) => {
      const artist = artistName(brief.artist);
      map.set(artist, [...(map.get(artist) || []), brief]);
      return map;
    }, new Map<string, BriefRow[]>())
  )
    .map(([artist, artistBriefs]) => {
      const latest = newestBrief(artistBriefs);
      const draftCount = artistBriefs.filter((brief) => brief.status !== "done").length;
      const completedCount = artistBriefs.length - draftCount;
      const readyCount = artistBriefs.filter(
        (brief) => brief.status !== "done" && brief.missing_required_fields.length === 0
      ).length;

      return {
        artist,
        briefs: artistBriefs,
        latestBrief: latest,
        latestRelease: latest.release_title?.trim() || "Untitled release",
        draftCount,
        completedCount,
        readyCount,
        platforms: platformBadges(artistBriefs)
      };
    })
    .sort((a, b) => new Date(b.latestBrief.updated_at).getTime() - new Date(a.latestBrief.updated_at).getTime());
}

export function ArtistDesktop({ briefs }: { briefs: BriefRow[] }) {
  const groups = groupBriefs(briefs);
  const totalBriefs = briefs.length;
  const unfinishedDrafts = briefs.filter((brief) => brief.status !== "done").length;
  const readyToBuild = briefs.filter(
    (brief) => brief.status !== "done" && brief.missing_required_fields.length === 0
  ).length;
  const completedLive = briefs.filter((brief) => brief.status === "done").length;

  return (
    <section className="premium-inbox animate-rise">
      <div className="inbox-hero-panel">
        <div className="inbox-hero-copy">
          <p className="pixel-label">Campaign operating system</p>
          <h1>Campaign Inbox</h1>
          <p>Briefs, drafts and builds in one place. Pick an artist, continue a queue, or start a clean import.</p>
        </div>
        <div className="inbox-hero-actions">
          <Link href="/new" className="pixel-button focus-ring">
            + Start new brief
          </Link>
        </div>
        <div className="inbox-stat-grid" aria-label="Inbox stats">
          <div>
            <span>Total briefs</span>
            <strong>{totalBriefs}</strong>
          </div>
          <div>
            <span>Unfinished drafts</span>
            <strong>{unfinishedDrafts}</strong>
          </div>
          <div>
            <span>Ready to build</span>
            <strong>{readyToBuild}</strong>
          </div>
          <div>
            <span>Completed/live</span>
            <strong>{completedLive}</strong>
          </div>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="premium-empty-panel">
          <p className="pixel-label">Empty inbox</p>
          <h2>No campaigns yet.</h2>
          <p>Create or import the first brief and the artist card appears here.</p>
        </div>
      ) : (
        <div className="artist-card-grid" aria-label="Artist campaigns">
          {groups.map((group) => (
            <article key={group.artist} className="artist-command-card">
              <Link
                href={`/inbox?artist=${encodeURIComponent(group.artist)}`}
                className="artist-command-link focus-ring"
                aria-label={`Open ${group.artist} campaigns`}
              >
                <div className="artist-card-topline">
                  <span>{group.briefs.length} brief{group.briefs.length === 1 ? "" : "s"}</span>
                  <span>Updated {formatUpdated(group.latestBrief.updated_at)}</span>
                </div>
                <div className="artist-card-main">
                  <h2>{group.artist}</h2>
                  <p>{group.latestRelease}</p>
                </div>
                <div className="artist-card-metrics">
                  <span><strong>{group.draftCount}</strong> drafts</span>
                  <span><strong>{group.readyCount}</strong> ready</span>
                  <span><strong>{group.completedCount}</strong> done</span>
                </div>
                <div className="artist-card-footer">
                  <div className="platform-badge-row">
                    {group.platforms.length ? (
                      group.platforms.map((platform) => <span key={platform}>{platform}</span>)
                    ) : (
                      <span>Platform TBC</span>
                    )}
                  </div>
                  <span className="artist-card-arrow">Open</span>
                </div>
              </Link>
              <DeleteArtistFolderButton artist={group.artist} count={group.briefs.length} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
