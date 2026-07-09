import type { JDWCampaignBrief } from "@/lib/brief-schema";

type StructuredBriefViewProps = {
  brief: JDWCampaignBrief;
};

function valueText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Unknown";
  return String(value);
}

function Tile({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="pixel-panel p-3">
      <dt className="pixel-label">{label}</dt>
      <dd className="mt-1 font-black">{valueText(value)}</dd>
    </div>
  );
}

export function StructuredBriefView({ brief }: StructuredBriefViewProps) {
  const budget = [brief.budget.amount === null ? null : brief.budget.amount, brief.budget.currency, brief.budget.type]
    .filter(Boolean)
    .join(" / ");
  const dates = [brief.campaign.start_date, brief.campaign.end_date].filter(Boolean).join(" to ");
  const notes = [
    ...(brief.source?.source_notes ?? []),
    brief.campaign.campaign_notes || null,
    brief.budget.notes || null,
    ...brief.special_notes
  ].filter((note): note is string => Boolean(note && note.trim().length > 0));

  return (
    <section className="pixel-window p-4 sm:p-6">
      <div>
        <p className="pixel-label">Campaign card</p>
        <h2 className="mt-2 text-3xl font-black">Setup snapshot</h2>
      </div>
      <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Platform" value={brief.campaign.platform} />
        <Tile label="Account" value={brief.campaign.account} />
        <Tile label="ACID" value={brief.campaign.acid} />
        <Tile label="Objective" value={brief.campaign.objective} />
        <Tile label="Type" value={brief.campaign.campaign_type} />
        <Tile label="Event" value={brief.campaign.optimisation_event} />
        <Tile label="Pixel" value={brief.campaign.pixel} />
        <Tile label="Budget" value={budget || null} />
        <Tile label="Dates" value={dates || null} />
        <Tile label="Territory" value={brief.campaign.territory_summary} />
        <Tile label="Conversion" value={brief.campaign.conversion_location} />
        <Tile label="Source" value={brief.source?.source_title || brief.source?.source_type || null} />
      </dl>
      {notes.length > 0 ? (
        <details className="mt-5 pixel-card p-4">
          <summary className="cursor-pointer font-mono text-sm font-black uppercase tracking-[0.16em]">Notes ({notes.length})</summary>
          <div className="mt-3 grid gap-2 text-sm font-semibold">
            {notes.map((note, index) => (
              <p key={`${note}-${index}`} className="whitespace-pre-wrap border-4 border-black bg-[#f4f1e4] p-3">{note}</p>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
