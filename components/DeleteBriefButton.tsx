"use client";

import { useTransition } from "react";
import { deleteBriefAction } from "@/app/actions";

type DeleteBriefButtonProps = {
  briefId: string;
};

export function DeleteBriefButton({ briefId }: DeleteBriefButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("Delete this brief?")) return;
        startTransition(async () => {
          await deleteBriefAction(briefId);
        });
      }}
      className="mini-button danger disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? "Deleting..." : "Delete brief"}
    </button>
  );
}
