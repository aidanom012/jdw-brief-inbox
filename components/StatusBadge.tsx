import { STATUS_LABELS, statusBadgeClass, type BriefStatus } from "@/lib/status";

type StatusBadgeProps = {
  status: BriefStatus;
  className?: string;
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-sm font-semibold ${statusBadgeClass(
        status
      )} ${className}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
