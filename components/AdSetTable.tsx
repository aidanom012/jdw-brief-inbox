import type { JDWAd, JDWCampaignBrief } from "@/lib/brief-schema";

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

function AdCard({ ad, index }: { ad: JDWAd; index: number }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-semibold text-zinc-100">{ad.label || `Ad ${index + 1}`}</h4>
        <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-xs text-cyan-100">
          {valueText(ad.asset_type)}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Song / release</dt>
          <dd className="text-zinc-100">{valueText(ad.release_title)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Destination URL</dt>
          <dd className="break-words text-zinc-100">{valueText(ad.destination_url)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Asset links</dt>
          <dd className="space-y-1 break-words text-zinc-100">
            {ad.asset_links.length > 0 ? ad.asset_links.map((link) => <p key={link}>{link}</p>) : "Unknown"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Copy</dt>
          <dd className="whitespace-pre-wrap text-zinc-100">{valueText(ad.copy)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Post URL</dt>
          <dd className="break-words text-zinc-100">{valueText(ad.post_url)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Boost code</dt>
          <dd className="break-words font-mono text-xs text-zinc-100">{valueText(ad.boost_code)}</dd>
        </div>
      </dl>
      {ad.notes ? <p className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-zinc-300">{ad.notes}</p> : null}
    </article>
  );
}

export function AdSetTable({ adSets }: AdSetTableProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-panel/80 p-4 shadow-glow backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">Structure</p>
          <h2 className="mt-1 text-xl font-black text-white">Ad sets + ads</h2>
        </div>
        <span className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-zinc-300">
          {adSets.length} ad sets
        </span>
      </div>
      <div className="mt-4 grid gap-4">
        {adSets.length === 0 ? (
          <p className="text-sm text-zinc-400">No ad sets supplied.</p>
        ) : (
          adSets.map((adSet, index) => {
            const nestedAds = adSet.ads || [];

            return (
              <article key={`${adSet.label}-${index}`} className="animate-rise rounded-2xl border border-cyan-300/15 bg-ink/72 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Ad set {index + 1}</p>
                    <h3 className="mt-1 text-lg font-black text-zinc-100">{adSet.label || `Ad set ${index + 1}`}</h3>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300">
                    {nestedAds.length} nested ads
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-zinc-500">Locations</dt>
                    <dd className="text-zinc-100">{joinValues(adSet.locations)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Age</dt>
                    <dd className="text-zinc-100">
                      {adSet.age_min !== null && adSet.age_max !== null ? `${adSet.age_min}-${adSet.age_max}` : "Unknown"}
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
                {adSet.targeting_details || adSet.exclusions || adSet.notes ? (
                  <div className="mt-4 grid gap-2 text-sm text-zinc-300">
                    {adSet.targeting_details ? <p className="rounded-lg border border-white/10 bg-black/20 p-3">{adSet.targeting_details}</p> : null}
                    {adSet.exclusions ? <p className="rounded-lg border border-white/10 bg-black/20 p-3">Exclusions: {adSet.exclusions}</p> : null}
                    {adSet.notes ? <p className="rounded-lg border border-white/10 bg-black/20 p-3">Notes: {adSet.notes}</p> : null}
                  </div>
                ) : null}
                {nestedAds.length > 0 ? (
                  <div className="mt-5 border-t border-white/10 pt-5">
                    <h4 className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">Ads under this ad set</h4>
                    <div className="grid gap-3">
                      {nestedAds.map((ad, adIndex) => <AdCard key={`${ad.label}-${adIndex}`} ad={ad} index={adIndex} />)}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
