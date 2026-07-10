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
        const typed = window.prompt("Permanent delete. Type DELETE to remove this campaign brief forever.");
        if (typed !== "DELETE") return;
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
