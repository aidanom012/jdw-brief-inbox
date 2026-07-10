"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { duplicateBriefAction } from "@/app/actions";

type DuplicateCampaignButtonProps = {
  briefId: string;
  label?: string;
};

export function DuplicateCampaignButton({ briefId, label = "Duplicate" }: DuplicateCampaignButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        startTransition(async () => {
          const result = await duplicateBriefAction(briefId);
          if (result.ok) {
            router.push(`/brief/${result.id}/edit`);
            return;
          }
          window.alert(result.message);
        });
      }}
      className="mini-button focus-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? "Duplicating..." : label}
    </button>
  );
}
