"use client";

import { useTransition } from "react";
import { deleteArtistFolderAction } from "@/app/actions";

type DeleteArtistFolderButtonProps = {
  artist: string;
  count: number;
};

export function DeleteArtistFolderButton({ artist, count }: DeleteArtistFolderButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const typed = window.prompt(
          `Permanent delete. This removes ${count} campaign brief${count === 1 ? "" : "s"}. Type the artist name exactly to delete this artist workspace: ${artist}`
        );
        if (typed !== artist) return;
        startTransition(async () => {
          await deleteArtistFolderAction(artist);
        });
      }}
      className="folder-delete focus-ring disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={`Delete ${artist} workspace`}
      title={`Delete ${artist} workspace`}
    >
      {isPending ? "..." : "×"}
    </button>
  );
}
