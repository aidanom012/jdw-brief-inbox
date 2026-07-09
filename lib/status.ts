import type { JDWCampaignBrief } from "@/lib/brief-schema";

// Keep database-safe values so existing Supabase projects do not need a migration.
// UI labels are simplified to Draft / Completed.
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
    ? "border-black bg-black text-[#f4f1e4]"
    : "border-black bg-[#f4f1e4] text-black";
}
