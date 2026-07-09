import type { JDWCampaignBrief } from "@/lib/brief-schema";

// Keep database-safe values so existing Supabase projects do not need a migration.
// Completed is the archive/finished state; Delete is still permanent.
export const BRIEF_STATUSES = ["received", "done"] as const;

export type BriefStatus = (typeof BRIEF_STATUSES)[number];

export const STATUS_LABELS: Record<BriefStatus, string> = {
  received: "Draft",
  done: "Completed"
};

export function isBriefStatus(value: string): value is BriefStatus {
  return BRIEF_STATUSES.includes(value as BriefStatus);
}

export function defaultStatusForMissingFields(_missingFields: string[]): BriefStatus {
  return "received";
}

export function defaultStatusForBrief(_brief: JDWCampaignBrief, _missingFields: string[]): BriefStatus {
  return "received";
}

export function statusBadgeClass(status: BriefStatus): string {
  return status === "done"
    ? "border-[#071013] bg-[#071013] text-[#dfe0e2]"
    : "border-[#071013] bg-[#f7f8f8] text-[#071013]";
}
