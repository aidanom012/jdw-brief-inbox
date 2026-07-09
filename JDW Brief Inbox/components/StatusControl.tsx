"use client";

import { useState, useTransition } from "react";
import { updateBriefStatusAction } from "@/app/actions";
import { BRIEF_STATUSES, STATUS_LABELS, type BriefStatus } from "@/lib/status";

type StatusControlProps = {
  briefId: string;
  status: BriefStatus;
};

export function StatusControl({ briefId, status }: StatusControlProps) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isPending, startTransition] = useTransition();

  return (
    <label className="block">
      <span className="text-sm text-zinc-500">Status</span>
      <select
        value={currentStatus}
        disabled={isPending}
        onChange={(event) => {
          const nextStatus = event.target.value as BriefStatus;
          setCurrentStatus(nextStatus);
          startTransition(async () => {
            await updateBriefStatusAction(briefId, nextStatus);
          });
        }}
        className="focus-ring mt-2 w-full min-w-52 rounded-md border border-white/10 bg-ink px-3 py-3 font-semibold text-white"
      >
        {BRIEF_STATUSES.map((option) => (
          <option key={option} value={option}>
            {STATUS_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
