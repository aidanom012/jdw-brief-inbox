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

export function statusBadgeClass(status: BriefStatus): string {
  switch (status) {
    case "incomplete":
      return "border-red-400/40 bg-red-500/15 text-red-100";
    case "ready_to_build":
      return "border-emerald-400/40 bg-emerald-500/15 text-emerald-100";
    case "building":
      return "border-cyan-400/40 bg-cyan-500/15 text-cyan-100";
    case "needs_james":
      return "border-amber-400/40 bg-amber-500/15 text-amber-100";
    case "done":
      return "border-lime-400/40 bg-lime-500/15 text-lime-100";
    case "received":
    default:
      return "border-white/15 bg-white/10 text-zinc-100";
  }
}
