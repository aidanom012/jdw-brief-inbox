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
        const message = `Delete the ${artist} folder and all ${count} campaign brief${count === 1 ? "" : "s"} inside it? This cannot be undone.`;
        if (!window.confirm(message)) return;
        startTransition(async () => {
          await deleteArtistFolderAction(artist);
        });
      }}
      className="folder-delete focus-ring disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={`Delete ${artist} folder`}
      title={`Delete ${artist} folder`}
    >
      {isPending ? "..." : "×"}
    </button>
  );
}
