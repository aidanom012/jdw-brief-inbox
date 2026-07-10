"use client";

import { useTransition } from "react";
import { deleteBriefFromListAction } from "@/app/actions";

type DeleteCampaignButtonProps = {
  briefId: string;
  label?: string;
};

export function DeleteCampaignButton({ briefId, label = "Delete" }: DeleteCampaignButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!window.confirm("Delete this campaign brief permanently?")) return;
        startTransition(async () => {
          await deleteBriefFromListAction(briefId);
        });
      }}
      className="mini-button danger focus-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? "Deleting..." : label}
    </button>
  );
}
