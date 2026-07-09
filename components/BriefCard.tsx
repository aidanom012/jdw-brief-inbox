import Link from "next/link";
import type { BriefRow } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";

type BriefCardProps = {
  brief: BriefRow;
};

function display(value: string | null | undefined): string {
  return value && value.trim() ? value : "Unknown";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function BriefCard({ brief }: BriefCardProps) {
  return (
    <article className="rounded-lg border border-white/10 bg-panel p-4 shadow-glow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StatusBadge status={brief.status} />
        <span className="text-sm text-zinc-400">{formatDate(brief.created_at)}</span>
      </div>
      <div className="mt-4">
        <h2 className="text-xl font-semibold text-white">{display(brief.artist)}</h2>
        <p className="mt-1 text-zinc-300">{display(brief.release_title)}</p>
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Platform</dt>
          <dd className="font-medium text-zinc-100">{display(brief.platform)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Account</dt>
          <dd className="font-medium text-zinc-100">{display(brief.account)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Objective</dt>
          <dd className="font-medium text-zinc-100">{display(brief.objective)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">ACID</dt>
          <dd className="font-medium text-zinc-100">{display(brief.acid)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span
          className={`rounded-full border px-3 py-1 text-sm ${
            brief.missing_required_fields.length > 0
              ? "border-red-400/30 bg-red-500/12 text-red-100"
              : "border-emerald-400/30 bg-emerald-500/12 text-emerald-100"
          }`}
        >
          {brief.missing_required_fields.length} missing
        </span>
        <Link
          href={`/brief/${brief.id}`}
          className="focus-ring rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Open Brief
        </Link>
      </div>
    </article>
  );
}
