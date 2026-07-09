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

  function update(nextStatus: BriefStatus) {
    setCurrentStatus(nextStatus);
    startTransition(async () => {
      await updateBriefStatusAction(briefId, nextStatus);
    });
  }

  return (
    <div>
      <span className="pixel-label block">Archive state</span>
      <div className="mt-2 flex flex-wrap gap-2">
        {(["received", "done"] as BriefStatus[]).map((option) => (
          <button
            key={option}
            type="button"
            disabled={isPending || currentStatus === option}
            onClick={() => update(option)}
            className={`mini-button focus-ring px-4 py-3 disabled:cursor-not-allowed ${currentStatus === option ? "safe" : ""}`}
          >
            {STATUS_LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
