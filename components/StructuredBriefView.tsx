import type { JDWCampaignBrief } from "@/lib/brief-schema";

type StructuredBriefViewProps = {
  brief: JDWCampaignBrief;
};

function valueText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }

  return String(value);
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="mt-1 font-medium text-zinc-100">{valueText(value)}</dd>
    </div>
  );
}

export function StructuredBriefView({ brief }: StructuredBriefViewProps) {
  const budget = [
    brief.budget.amount === null ? null : brief.budget.amount,
    brief.budget.currency,
    brief.budget.type
  ]
    .filter(Boolean)
    .join(" / ");

  const dates = [brief.campaign.start_date, brief.campaign.end_date].filter(Boolean).join(" to ");
  const hasBuildContext = brief.source || brief.build;

  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4">
      <h2 className="text-lg font-semibold text-white">Campaign setup</h2>
      {hasBuildContext ? (
        <dl className="mt-4 grid grid-cols-1 gap-4 rounded-md border border-white/10 bg-ink/70 p-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Source" value={brief.source?.source_type || null} />
          <Field label="Source title" value={brief.source?.source_title || null} />
          <Field label="Source date" value={brief.source?.source_date || null} />
          <Field label="Build action" value={brief.build?.action || null} />
          <Field label="Existing campaign" value={brief.build?.existing_campaign_name || null} />
          <Field label="Priority" value={brief.build?.priority || null} />
          <Field
            label="Approval required"
            value={brief.build?.approval_required === null || brief.build?.approval_required === undefined
              ? null
              : brief.build.approval_required
                ? "Yes"
                : "No"}
          />
          <Field label="Launch instruction" value={brief.build?.launch_instruction || null} />
          <Field label="Original item" value={brief.source?.original_item_label || null} />
        </dl>
      ) : null}
      <dl className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field label="Campaign objective" value={brief.campaign.objective} />
        <Field label="Campaign type" value={brief.campaign.campaign_type} />
        <Field label="Conversion location" value={brief.campaign.conversion_location} />
        <Field label="Optimisation event" value={brief.campaign.optimisation_event} />
        <Field label="Pixel" value={brief.campaign.pixel} />
        <Field label="Budget" value={budget || null} />
        <Field label="Dates" value={dates || null} />
        <Field label="Territory" value={brief.campaign.territory_summary} />
        <Field label="ASID" value={brief.campaign.asid || null} />
      </dl>
      {brief.budget.notes || brief.special_notes.length > 0 ? (
        <div className="mt-5 grid gap-3 text-sm text-zinc-300">
          {brief.source?.source_notes.map((note) => (
            <p key={note} className="rounded-md border border-white/10 bg-ink/70 p-3">
              Source: {note}
            </p>
          ))}
          {brief.budget.notes ? (
            <p className="rounded-md border border-white/10 bg-ink/70 p-3">{brief.budget.notes}</p>
          ) : null}
          {brief.special_notes.map((note) => (
            <p key={note} className="rounded-md border border-white/10 bg-ink/70 p-3">
              {note}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
