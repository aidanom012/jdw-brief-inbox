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
    <article className="animate-rise rounded-2xl border border-white/10 bg-panel/80 p-5 shadow-glow backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-cyan-300/25 hover:shadow-neon">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StatusBadge status={brief.status} />
        <span className="font-mono text-xs text-zinc-500">{formatDate(brief.created_at)}</span>
      </div>
      <div className="mt-5">
        <h2 className="text-2xl font-black tracking-tight text-white">{display(brief.artist)}</h2>
        <p className="mt-1 text-zinc-300">{display(brief.release_title)}</p>
      </div>
      <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <dt className="text-zinc-500">Platform</dt>
          <dd className="font-medium text-zinc-100">{display(brief.platform)}</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <dt className="text-zinc-500">Account</dt>
          <dd className="font-medium text-zinc-100">{display(brief.account)}</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <dt className="text-zinc-500">Objective</dt>
          <dd className="font-medium text-zinc-100">{display(brief.objective)}</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <dt className="text-zinc-500">ACID</dt>
          <dd className="font-medium text-zinc-100">{display(brief.acid)}</dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span
          className={`rounded-full border px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em] ${
            brief.missing_required_fields.length > 0
              ? "border-red-400/30 bg-red-500/12 text-red-100"
              : "border-lime-400/30 bg-lime-500/12 text-lime-100"
          }`}
        >
          {brief.missing_required_fields.length} missing
        </span>
        <Link href={`/brief/${brief.id}`} className="mini-button focus-ring">
          Open
        </Link>
      </div>
    </article>
  );
}
