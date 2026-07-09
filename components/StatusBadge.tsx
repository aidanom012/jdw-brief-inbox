import { STATUS_LABELS, statusBadgeClass, type BriefStatus } from "@/lib/status";

type StatusBadgeProps = {
  status: BriefStatus;
  className?: string;
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-8 items-center border-4 px-3 py-1 font-mono text-xs font-black uppercase tracking-[0.14em] ${statusBadgeClass(
        status
      )} ${className}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
