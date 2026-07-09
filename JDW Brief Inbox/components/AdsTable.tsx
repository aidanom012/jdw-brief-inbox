import type { JDWCampaignBrief } from "@/lib/brief-schema";

type AdsTableProps = {
  ads: JDWCampaignBrief["ads"];
};

function valueText(value: string | null | undefined): string {
  return value && value.trim() ? value : "Unknown";
}

export function AdsTable({ ads }: AdsTableProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4">
      <h2 className="text-lg font-semibold text-white">Ads</h2>
      <div className="mt-4 grid gap-3">
        {ads.length === 0 ? (
          <p className="text-sm text-zinc-400">No ads supplied.</p>
        ) : (
          ads.map((ad, index) => (
            <article key={`${ad.label}-${index}`} className="rounded-md border border-white/10 bg-ink/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold text-zinc-100">{ad.label || `Ad ${index + 1}`}</h3>
                <span className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-300">
                  {valueText(ad.asset_type)}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-zinc-500">Song</dt>
                  <dd className="text-zinc-100">{valueText(ad.release_title)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Destination URL</dt>
                  <dd className="break-words text-zinc-100">{valueText(ad.destination_url)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Asset links</dt>
                  <dd className="space-y-1 break-words text-zinc-100">
                    {ad.asset_links.length > 0
                      ? ad.asset_links.map((link) => <p key={link}>{link}</p>)
                      : "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Copy</dt>
                  <dd className="whitespace-pre-wrap text-zinc-100">{valueText(ad.copy)}</dd>
                </div>
              </dl>
              {ad.notes ? <p className="mt-3 text-sm text-zinc-300">{ad.notes}</p> : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
