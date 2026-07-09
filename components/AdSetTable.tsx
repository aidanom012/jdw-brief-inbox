import type { JDWAd, JDWCampaignBrief } from "@/lib/brief-schema";

type AdSetTableProps = {
  adSets: JDWCampaignBrief["ad_sets"];
};

function valueText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }

  return String(value);
}

function linksForAd(ad: JDWAd): string[] {
  return [
    ...ad.asset_links,
    ad.post_url || null,
    ad.boost_code || null,
    ad.destination_url || null
  ].filter((item): item is string => Boolean(item && item.trim().length > 0));
}

function AdCard({ ad, index }: { ad: JDWAd; index: number }) {
  const links = linksForAd(ad);

  return (
    <article className="pixel-ad-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-lg font-black text-[#201203]">{ad.label || `Ad ${index + 1}`}</h4>
        <span className="mini-button bg-[#8fb9ff]">{valueText(ad.asset_type)}</span>
      </div>
      <div className="mt-4 grid gap-3 text-sm font-bold text-[#33240d] md:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#6d5428]">Asset / link</p>
          <div className="mt-2 space-y-1 break-words">
            {links.length > 0 ? links.map((link) => <p key={link}>{link}</p>) : <p>Unknown</p>}
          </div>
        </div>
        <div>
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#6d5428]">Text / copy</p>
          <p className="mt-2 whitespace-pre-wrap">{valueText(ad.copy)}</p>
        </div>
      </div>
      {ad.notes ? <p className="mt-3 border-4 border-[#201203] bg-[#fff3cf] p-3 text-sm font-bold text-[#33240d]">{ad.notes}</p> : null}
    </article>
  );
}

export function AdSetTable({ adSets }: AdSetTableProps) {
  return (
    <section className="pixel-window p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#d34f1f]">Structure</p>
          <h2 className="mt-1 text-2xl font-black text-[#201203]">Ad sets + ads</h2>
        </div>
        <span className="mini-button bg-[#ffc832]">{adSets.length} ad sets</span>
      </div>
      <div className="mt-5 grid gap-5">
        {adSets.length === 0 ? (
          <p className="text-sm font-bold text-[#6b593a]">No ad sets supplied.</p>
        ) : (
          adSets.map((adSet, index) => {
            const nestedAds = adSet.ads || [];
            const budget = adSet.budget_amount !== null && adSet.budget_amount !== undefined
              ? `${adSet.budget_amount} ${valueText(adSet.budget_type)}`
              : "Campaign level / not split";

            return (
              <article key={`${adSet.label}-${index}`} className="animate-rise pixel-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#d34f1f]">Ad set {index + 1}</p>
                    <h3 className="mt-1 text-2xl font-black text-[#201203]">{adSet.label || `Ad set ${index + 1}`}</h3>
                  </div>
                  <span className="mini-button">{nestedAds.length} ads</span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="border-4 border-[#201203] bg-[#fff3cf] p-3 md:col-span-2">
                    <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#6d5428]">What it does / targeting</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-bold text-[#33240d]">
                      {valueText(adSet.targeting_details || adSet.notes || null)}
                    </p>
                  </div>
                  <div className="border-4 border-[#201203] bg-[#ffe090] p-3">
                    <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#6d5428]">Ad set budget</p>
                    <p className="mt-2 text-sm font-black text-[#33240d]">{budget}</p>
                  </div>
                </div>

                {nestedAds.length > 0 ? (
                  <div className="mt-5 border-t-4 border-[#201203] pt-5">
                    <h4 className="mb-3 font-mono text-xs font-black uppercase tracking-[0.18em] text-[#201203]">Ads under this ad set</h4>
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
