"use client";

import { useState, useTransition } from "react";
import { updateBriefStatusAction } from "@/app/actions";
import { STATUS_LABELS, type BriefStatus } from "@/lib/status";

type StatusControlProps = {
  briefId: string;
  status: BriefStatus;
};

export function StatusControl({ briefId, status }: StatusControlProps) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isPending, startTransition] = useTransition();
  const nextStatus: BriefStatus = currentStatus === "done" ? "received" : "done";

  function update() {
    setCurrentStatus(nextStatus);
    startTransition(async () => {
      await updateBriefStatusAction(briefId, nextStatus);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="pixel-flow-chip">{STATUS_LABELS[currentStatus]}</span>
      <button
        type="button"
        disabled={isPending}
        onClick={update}
        className={`mini-button focus-ring px-4 py-3 disabled:cursor-not-allowed ${nextStatus === "done" ? "safe" : ""}`}
      >
        {isPending ? "Saving..." : nextStatus === "done" ? "Mark completed" : "Back to draft"}
      </button>
    </div>
  );
}
