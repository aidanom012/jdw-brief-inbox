import type { CSSProperties } from "react";
import Link from "next/link";
import { StartBriefMenu } from "@/components/StartBriefMenu";
import type { BriefRow } from "@/lib/db";
import { DeleteArtistFolderButton } from "@/components/DeleteArtistFolderButton";
import ArtistCabinet3D from "@/components/ArtistCabinet3D.client";

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

export function ArtistDesktop({ briefs }: { briefs: BriefRow[] }) {
  const groups = Array.from(
    briefs.reduce((map, brief) => {
      const artist = folderName(brief.artist);
      map.set(artist, [...(map.get(artist) || []), brief]);
      return map;
    }, new Map<string, BriefRow[]>())
  ).sort(([a], [b]) => a.localeCompare(b));

  const cabinetArtists = groups.map(([artist, artistBriefs]) => {
    const projects = uniqueProjects(artistBriefs);
    const draftCount = artistBriefs.filter((brief) => brief.status !== "done").length;
    const completedCount = artistBriefs.length - draftCount;
    return {
      name: artist,
      href: `/inbox?artist=${encodeURIComponent(artist)}`,
      briefCount: artistBriefs.length,
      draftCount,
      completedCount,
      projectPreview: projects.slice(0, 1).join(" / ") || undefined,
    };
  });

  return (
    <section className="desktop-screen animate-rise">
      <div className="desktop-titlebar" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="desktop-header">
        <div>
          <p className="pixel-label">Desktop</p>
          <h1>Artist folders</h1>
          <p>
            Open an artist folder to see their campaigns. New briefs automatically save into the matching folder.
          </p>
        </div>
        <StartBriefMenu label="+ Start new brief" variant="desktop" />
      </div>

      {groups.length > 0 ? <ArtistCabinet3D artists={cabinetArtists} /> : null}

      {groups.length === 0 ? (
        <div className="empty-desktop-panel">
          <p className="pixel-label">Empty desktop</p>
          <h2>No artist folders yet.</h2>
          <p>Make your first brief and the folder appears here.</p>
        </div>
      ) : (
        <div className="desktop-icon-grid" aria-label="Artist folders">
          {groups.map(([artist, artistBriefs], index) => {
            const projects = uniqueProjects(artistBriefs);
            const draftCount = artistBriefs.filter((brief) => brief.status !== "done").length;
            const completedCount = artistBriefs.length - draftCount;
            return (
              <div
                key={artist}
                className="folder-shell desktop-folder"
                style={{ "--folder-delay": `${Math.min(index, 20) * 22}ms` } as CSSProperties}
              >
                <Link
                  href={`/inbox?artist=${encodeURIComponent(artist)}`}
                  className="folder-card focus-ring"
                  aria-label={`Open ${artist} folder`}
                >
                  <span className="folder-icon" aria-hidden="true">
                    <span />
                  </span>
                  <span className="folder-name folder-title-text">{artist}</span>
                  <span className="folder-count">
                    {artistBriefs.length} brief{artistBriefs.length === 1 ? "" : "s"}
                    {" · "}
                    {draftCount} draft
                    {completedCount ? ` · ${completedCount} done` : ""}
                  </span>
                  {projects.length ? (
                    <span className="folder-project-text folder-preview">
                      {projects.slice(0, 1).join(" / ")}
                    </span>
                  ) : null}
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
