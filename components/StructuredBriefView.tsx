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
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</dt>
      <dd className="mt-1 font-medium text-zinc-100">{valueText(value)}</dd>
    </div>
  );
}

export function StructuredBriefView({ brief }: StructuredBriefViewProps) {
  const budget = [brief.budget.amount === null ? null : brief.budget.amount, brief.budget.currency, brief.budget.type]
    .filter(Boolean)
    .join(" / ");

  const dates = [brief.campaign.start_date, brief.campaign.end_date].filter(Boolean).join(" to ");
  const hasBuildContext = brief.source || brief.build;
  const sourceNotes = brief.source?.source_notes ?? [];
  const notes = [
    ...sourceNotes.map((note) => `Source: ${note}`),
    brief.campaign.campaign_notes || null,
    brief.budget.notes || null,
    ...brief.special_notes
  ].filter((note): note is string => Boolean(note && note.trim().length > 0));

  return (
    <section className="rounded-2xl border border-white/10 bg-panel/80 p-4 shadow-glow backdrop-blur-xl">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">Brief data</p>
        <h2 className="mt-1 text-xl font-black text-white">Campaign setup</h2>
      </div>
      {hasBuildContext ? (
        <dl className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Source" value={brief.source?.source_type || null} />
          <Field label="Source title" value={brief.source?.source_title || null} />
          <Field label="Source date" value={brief.source?.source_date || null} />
          <Field label="Build action" value={brief.build?.action || null} />
          <Field label="Existing campaign" value={brief.build?.existing_campaign_name || null} />
          <Field label="Priority" value={brief.build?.priority || null} />
          <Field
            label="Approval required"
            value={brief.build?.approval_required === null || brief.build?.approval_required === undefined ? null : brief.build.approval_required ? "Yes" : "No"}
          />
          <Field label="Launch instruction" value={brief.build?.launch_instruction || null} />
          <Field label="Original item" value={brief.source?.original_item_label || null} />
        </dl>
      ) : null}
      <dl className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
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
      {notes.length > 0 ? (
        <div className="mt-5 grid gap-3 text-sm text-zinc-300">
          {notes.map((note, index) => (
            <p key={`${note}-${index}`} className="rounded-xl border border-white/10 bg-ink/70 p-3">
              {note}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
