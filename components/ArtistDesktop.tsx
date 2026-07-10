import type { CSSProperties } from "react";
import Link from "next/link";
import type { BriefRow } from "@/lib/db";
import { DeleteArtistFolderButton } from "@/components/DeleteArtistFolderButton";

function folderName(value: string | null | undefined): string {
  const clean = value?.trim();
  return clean || "Unknown artist";
}

function uniqueProjects(briefs: BriefRow[]): string[] {
  return Array.from(
    new Set(
      briefs
        .map((brief) => brief.release_title?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function updatedLabel(briefs: BriefRow[]): string {
  const latest = briefs
    .map((brief) => new Date(brief.updated_at || brief.created_at).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  if (!latest) return "No updates";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short"
  }).format(new Date(latest));
}

export function ArtistDesktop({ briefs }: { briefs: BriefRow[] }) {
  const groups = Array.from(
    briefs.reduce((map, brief) => {
      const artist = folderName(brief.artist);
      map.set(artist, [...(map.get(artist) || []), brief]);
      return map;
    }, new Map<string, BriefRow[]>())
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <section className="desktop-wrap pixel-window p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="pixel-label">8-bit desktop</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Artist folders</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold pixel-muted">
            Open an artist folder to see the campaigns/projects inside. New manual briefs remember artists and projects for next time.
          </p>
        </div>
        <Link href="/new" className="pixel-button focus-ring px-5 py-4 text-sm">
          + Start new brief
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="pixel-card p-8 text-center">
          <p className="pixel-label">Empty desktop</p>
          <h2 className="mt-2 text-2xl font-black">No artist folders yet.</h2>
          <p className="mt-2 font-semibold pixel-muted">Make your first brief and the folder appears here.</p>
        </div>
      ) : (
        <div className="desktop-grid">
          {groups.map(([artist, artistBriefs], index) => {
            const projects = uniqueProjects(artistBriefs);
            const draftCount = artistBriefs.filter((brief) => brief.status !== "done").length;
            const completedCount = artistBriefs.length - draftCount;
            const isCompletedFolder = artistBriefs.length > 0 && draftCount === 0;
            return (
              <div
                key={artist}
                className={`folder-shell ${isCompletedFolder ? "folder-shell-completed" : ""}`}
                style={{ "--folder-delay": `${Math.min(index, 14) * 24}ms` } as CSSProperties}
              >
                <Link
                  href={`/inbox?artist=${encodeURIComponent(artist)}`}
                  className={`folder-card focus-ring ${isCompletedFolder ? "folder-card-completed" : ""}`}
                >
                  <span className="folder-icon" aria-hidden="true">
                    <span />
                  </span>
                  <span className="mt-3 block text-xl font-black leading-tight folder-title-text">{artist}</span>
                  <span className="mt-2 block font-mono text-xs font-black uppercase tracking-[0.12em] pixel-muted">
                    {artistBriefs.length} brief{artistBriefs.length === 1 ? "" : "s"} · {draftCount} draft · {completedCount} completed
                  </span>
                  <span className="mt-3 block truncate text-sm font-bold pixel-muted folder-project-text">
                    {projects.length ? projects.slice(0, 3).join(" / ") : "No project name yet"}
                  </span>
                  <span className="mt-4 inline-block border-2 border-black px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.12em]">
                    {isCompletedFolder ? "completed" : `updated ${updatedLabel(artistBriefs)}`}
                  </span>
                </Link>
                <DeleteArtistFolderButton artist={artist} count={artistBriefs.length} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
