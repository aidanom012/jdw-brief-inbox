import Link from "next/link";
import type { BriefRow } from "@/lib/db";
import { DeleteCampaignButton } from "@/components/DeleteCampaignButton";
import { DuplicateCampaignButton } from "@/components/DuplicateCampaignButton";
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
  const isCompleted = brief.status === "done";
  const adSetCount = brief.raw_json.ad_sets.length;
  const nestedAdCount = brief.raw_json.ad_sets.reduce((total, adSet) => total + (adSet.ads || []).length, 0);
  const adCount = Math.max(nestedAdCount, (brief.raw_json.ads || []).length);

  return (
    <article className={`animate-rise pixel-window p-5 transition duration-150 hover:-translate-y-1 ${isCompleted ? "campaign-card-completed" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StatusBadge status={brief.status} />
        <span className="font-mono text-xs font-black uppercase tracking-[0.12em] pixel-muted">{formatDate(brief.created_at)}</span>
      </div>
      <div className="mt-5">
        <h2 className="text-2xl font-black tracking-tight campaign-title-text">{display(brief.artist)}</h2>
        <p className="mt-1 font-semibold pixel-muted campaign-project-text">{display(brief.release_title)}</p>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="pixel-panel p-3">
          <dt className="pixel-label">Platform</dt>
          <dd className="mt-1 font-black">{display(brief.platform)}</dd>
        </div>
        <div className="pixel-panel p-3">
          <dt className="pixel-label">ACID</dt>
          <dd className="mt-1 font-black">{display(brief.acid)}</dd>
        </div>
        <div className="pixel-panel p-3">
          <dt className="pixel-label">Ad sets</dt>
          <dd className="mt-1 font-black">{adSetCount}</dd>
        </div>
        <div className="pixel-panel p-3">
          <dt className="pixel-label">Ads</dt>
          <dd className="mt-1 font-black">{adCount}</dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span className={`pixel-missing px-3 py-2 font-mono text-xs font-black uppercase tracking-[0.12em] ${isCompleted ? "completed-chip" : ""}`}>
          {isCompleted ? "completed" : `${brief.missing_required_fields.length} missing`}
        </span>
        <div className="flex flex-wrap gap-2">
          <DuplicateCampaignButton briefId={brief.id} label="Duplicate" />
          <DeleteCampaignButton briefId={brief.id} label="Delete" />
          <Link href={`/brief/${brief.id}`} className="mini-button focus-ring">
            Open
          </Link>
        </div>
      </div>
    </article>
  );
}
