import type { JDWCampaignBrief } from "@/lib/brief-schema";

type StructuredBriefViewProps = {
  brief: JDWCampaignBrief;
};

function valueText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Unknown";
  return String(value);
}

function SnapshotStep({ index, label, value }: { index: number; label: string; value: string | number | null | undefined }) {
  return (
    <div className="meta-snapshot pixel-card p-4">
      <div className="flex items-start gap-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center border-4 border-black bg-[#071013] font-mono text-xs font-black text-[#dfe0e2]">
          {String(index).padStart(2, "0")}
        </span>
        <div>
          <dt className="pixel-label">{label}</dt>
          <dd className="mt-1 text-lg font-black leading-tight">{valueText(value)}</dd>
        </div>
      </div>
    </div>
  );
}

function metaSteps(brief: JDWCampaignBrief) {
  return [
    ["Platform", brief.campaign.platform],
    ["Account", brief.campaign.account],
    ["Campaign objective", brief.campaign.objective],
    ["Campaign type", brief.campaign.campaign_type],
    ["Conversion location", brief.campaign.conversion_location],
    ["Pixel", brief.campaign.pixel],
    ["Optimisation event", brief.campaign.optimisation_event],
    ["Budget", [brief.budget.amount, brief.budget.currency, brief.budget.type].filter(Boolean).join(" / ") || null],
    ["Territory", brief.campaign.territory_summary],
    ["Dates", [brief.campaign.start_date, brief.campaign.end_date].filter(Boolean).join(" to ") || null]
  ] as const;
}

function tiktokSteps(brief: JDWCampaignBrief) {
  return [
    ["Platform", brief.campaign.platform],
    ["Account", brief.campaign.account],
    ["ACID", brief.campaign.acid],
    ["Objective", brief.campaign.objective],
    ["Optimisation", brief.campaign.optimisation_event || "Spark / video view setup"],
    ["Budget", [brief.budget.amount, brief.budget.currency, brief.budget.type].filter(Boolean).join(" / ") || null],
    ["Territory", brief.campaign.territory_summary],
    ["Dates", [brief.campaign.start_date, brief.campaign.end_date].filter(Boolean).join(" to ") || null]
  ] as const;
}

function genericSteps(brief: JDWCampaignBrief) {
  return [
    ["Platform", brief.campaign.platform],
    ["Account", brief.campaign.account],
    ["ACID", brief.campaign.acid],
    ["Objective", brief.campaign.objective],
    ["Budget", [brief.budget.amount, brief.budget.currency, brief.budget.type].filter(Boolean).join(" / ") || null],
    ["Territory", brief.campaign.territory_summary]
  ] as const;
}

export function StructuredBriefView({ brief }: StructuredBriefViewProps) {
  const platform = brief.campaign.platform;
  const steps = platform === "Meta" ? metaSteps(brief) : platform === "TikTok" ? tiktokSteps(brief) : genericSteps(brief);
  const notes = [
    ...(brief.source?.source_notes ?? []),
    brief.campaign.campaign_notes || null,
    brief.budget.notes || null,
    ...brief.special_notes
  ].filter((note): note is string => Boolean(note && note.trim().length > 0));

  return (
    <section className="pixel-window p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="pixel-label">Setup snapshot</p>
          <h2 className="mt-2 text-3xl font-black">{platform === "TikTok" ? "TikTok build order" : platform === "Meta" ? "Meta build order" : "Campaign build order"}</h2>
          <p className="mt-1 text-sm font-semibold pixel-muted">Cascaded like Ads Manager: the important setup bits first, details only when needed.</p>
        </div>
      </div>

      <dl className="mt-5 max-w-3xl">
        {steps.map(([label, value], index) => (
          <SnapshotStep key={label} index={index + 1} label={label} value={value} />
        ))}
      </dl>

      {notes.length > 0 ? (
        <details className="mt-6 pixel-card p-4">
          <summary className="cursor-pointer font-mono text-sm font-black uppercase tracking-[0.16em]">Notes ({notes.length})</summary>
          <div className="mt-3 grid gap-2 text-sm font-semibold">
            {notes.map((note, index) => (
              <p key={`${note}-${index}`} className="whitespace-pre-wrap border-4 border-black bg-[#dfe0e2] p-3">{note}</p>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
