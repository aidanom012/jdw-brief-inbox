import type { JDWCampaignBrief } from "@/lib/brief-schema";

type AdSetTableProps = {
  adSets: JDWCampaignBrief["ad_sets"];
};

function joinValues(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "Unknown";
}

function valueText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }

  return String(value);
}

export function AdSetTable({ adSets }: AdSetTableProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4">
      <h2 className="text-lg font-semibold text-white">Ad sets</h2>
      <div className="mt-4 grid gap-3">
        {adSets.length === 0 ? (
          <p className="text-sm text-zinc-400">No ad sets supplied.</p>
        ) : (
          adSets.map((adSet, index) => (
            <article key={`${adSet.label}-${index}`} className="rounded-md border border-white/10 bg-ink/70 p-4">
              <h3 className="font-semibold text-zinc-100">{adSet.label || `Ad set ${index + 1}`}</h3>
              <dl className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-zinc-500">Locations</dt>
                  <dd className="text-zinc-100">{joinValues(adSet.locations)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Age</dt>
                  <dd className="text-zinc-100">
                    {adSet.age_min !== null && adSet.age_max !== null
                      ? `${adSet.age_min}-${adSet.age_max}`
                      : "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Gender</dt>
                  <dd className="text-zinc-100">{valueText(adSet.gender)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Placements</dt>
                  <dd className="text-zinc-100">{joinValues(adSet.placements)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Targeting</dt>
                  <dd className="text-zinc-100">{valueText(adSet.targeting_type)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Budget</dt>
                  <dd className="text-zinc-100">
                    {adSet.budget_amount !== null && adSet.budget_amount !== undefined
                      ? `${adSet.budget_amount} ${valueText(adSet.budget_type)}`
                      : "Campaign level"}
                  </dd>
                </div>
              </dl>
              {adSet.targeting_details || adSet.exclusions ? (
                <div className="mt-3 grid gap-2 text-sm text-zinc-300">
                  {adSet.targeting_details ? <p>{adSet.targeting_details}</p> : null}
                  {adSet.exclusions ? <p>Exclusions: {adSet.exclusions}</p> : null}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
