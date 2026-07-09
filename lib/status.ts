import type { JDWCampaignBrief } from "@/lib/brief-schema";

export const BRIEF_STATUSES = [
  "received",
  "incomplete",
  "ready_to_build",
  "building",
  "needs_james",
  "done"
] as const;

export type BriefStatus = (typeof BRIEF_STATUSES)[number];

export const STATUS_LABELS: Record<BriefStatus, string> = {
  received: "Received",
  incomplete: "Incomplete",
  ready_to_build: "Ready to Build",
  building: "Building",
  needs_james: "Needs James",
  done: "Done"
};

export function isBriefStatus(value: string): value is BriefStatus {
  return BRIEF_STATUSES.includes(value as BriefStatus);
}

export function defaultStatusForMissingFields(missingFields: string[]): BriefStatus {
  return missingFields.length > 0 ? "incomplete" : "ready_to_build";
}

export function defaultStatusForBrief(brief: JDWCampaignBrief, missingFields: string[]): BriefStatus {
  if (missingFields.length > 0) {
    return "incomplete";
  }

  if (
    brief.build?.approval_required === true ||
    brief.build?.priority === "hold" ||
    brief.build?.action === "hold"
  ) {
    return "needs_james";
  }

  return "ready_to_build";
}

export function statusBadgeClass(status: BriefStatus): string {
  switch (status) {
    case "incomplete":
      return "border-red-400/40 bg-red-500/15 text-red-100 shadow-[0_0_24px_rgba(248,113,113,.12)]";
    case "ready_to_build":
      return "border-emerald-400/40 bg-emerald-500/15 text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,.12)]";
    case "building":
      return "border-cyan-400/40 bg-cyan-500/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,.12)]";
    case "needs_james":
      return "border-amber-400/40 bg-amber-500/15 text-amber-100 shadow-[0_0_24px_rgba(251,191,36,.12)]";
    case "done":
      return "border-lime-400/40 bg-lime-500/15 text-lime-100 shadow-[0_0_24px_rgba(190,242,100,.12)]";
    case "received":
    default:
      return "border-white/15 bg-white/10 text-zinc-100";
  }
}
