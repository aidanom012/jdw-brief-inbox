type SuggestedNamingProps = {
  campaignName: string;
  adSetNames: string[];
  adNames: string[];
};

export function SuggestedNaming({ campaignName, adSetNames, adNames }: SuggestedNamingProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4">
      <h2 className="text-lg font-semibold text-white">Suggested naming</h2>
      <div className="mt-4 grid gap-4">
        <div>
          <p className="text-sm text-zinc-500">Campaign name</p>
          <p className="mt-1 break-words rounded-md border border-white/10 bg-ink/70 px-3 py-2 font-mono text-sm text-zinc-100">
            {campaignName}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500">Ad set names</p>
          <div className="mt-1 grid gap-2">
            {adSetNames.length > 0 ? (
              adSetNames.map((name) => (
                <p key={name} className="break-words rounded-md border border-white/10 bg-ink/70 px-3 py-2 font-mono text-sm">
                  {name}
                </p>
              ))
            ) : (
              <p className="text-sm text-zinc-400">No ad sets supplied.</p>
            )}
          </div>
        </div>
        <div>
          <p className="text-sm text-zinc-500">Ad names</p>
          <div className="mt-1 grid gap-2">
            {adNames.length > 0 ? (
              adNames.map((name) => (
                <p key={name} className="break-words rounded-md border border-white/10 bg-ink/70 px-3 py-2 font-mono text-sm">
                  {name}
                </p>
              ))
            ) : (
              <p className="text-sm text-zinc-400">No ads supplied.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
