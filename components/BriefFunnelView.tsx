"use client";

import { useMemo, useState } from "react";
import type { JDWAd, JDWAdSet, JDWCampaignBrief } from "@/lib/brief-schema";

type NodeSelection =
  | { type: "campaign"; id: "campaign" }
  | { type: "adset"; id: string }
  | { type: "ad"; id: string }
  | { type: "destination"; id: string };

type BriefFunnelViewProps = {
  brief: JDWCampaignBrief;
};

function value(value: string | number | null | undefined, fallback = "Unknown"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function truncate(valueToTrim: string | null | undefined, fallback = "Open details", length = 58): string {
  const text = value(valueToTrim, fallback);
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function sameAd(a: JDWAd, b: JDWAd): boolean {
  return (
    a.label === b.label &&
    a.release_title === b.release_title &&
    a.asset_type === b.asset_type &&
    a.destination_url === b.destination_url &&
    a.copy === b.copy &&
    JSON.stringify(a.asset_links || []) === JSON.stringify(b.asset_links || [])
  );
}

function adKey(ad: JDWAd, index: number): string {
  return `${ad.label || ad.release_title || "ad"}-${ad.destination_url || "dest"}-${index}`;
}

function allAdsForBrief(brief: JDWCampaignBrief): JDWAd[] {
  const flatAds = brief.ads || [];
  const nested = brief.ad_sets.flatMap((adSet) => adSet.ads || []);
  const source = flatAds.length > 0 ? flatAds : nested;
  const unique: JDWAd[] = [];
  source.forEach((ad) => {
    if (!unique.some((candidate) => sameAd(candidate, ad))) unique.push(ad);
  });
  return unique;
}

function uniqueAdsForAdSet(brief: JDWCampaignBrief, adSet: JDWAdSet, allAds: JDWAd[]): JDWAd[] {
  if ((adSet.ads || []).length > 0) {
    const unique: JDWAd[] = [];
    (adSet.ads || []).forEach((ad) => {
      const canonical = allAds.find((candidate) => sameAd(candidate, ad)) || ad;
      if (!unique.some((candidate) => sameAd(candidate, canonical))) unique.push(canonical);
    });
    return unique;
  }

  return allAds;
}

function adSetsForAd(brief: JDWCampaignBrief, ad: JDWAd): JDWAdSet[] {
  return brief.ad_sets.filter((adSet) => {
    if ((adSet.ads || []).length === 0) return true;
    return (adSet.ads || []).some((nestedAd) => sameAd(nestedAd, ad));
  });
}

function selectedDetails(brief: JDWCampaignBrief, selected: NodeSelection, allAds: JDWAd[]) {
  if (selected.type === "campaign") return { kind: "campaign" as const };
  if (selected.type === "adset") return { kind: "adset" as const, adSet: brief.ad_sets[Number(selected.id)] };
  if (selected.type === "destination") return { kind: "destination" as const, ad: allAds[Number(selected.id)] };
  return { kind: "ad" as const, ad: allAds[Number(selected.id)] };
}

function nodeSummaryForPlatform(brief: JDWCampaignBrief): string {
  if (brief.campaign.platform === "TikTok") {
    return [brief.campaign.objective, brief.campaign.optimisation_event || "Spark / video view setup"].filter(Boolean).join(" · ");
  }

  if (brief.campaign.platform === "Meta") {
    return [brief.campaign.objective, brief.campaign.campaign_type, brief.campaign.conversion_location].filter(Boolean).join(" · ");
  }

  return [brief.campaign.objective, brief.campaign.campaign_type].filter(Boolean).join(" · ");
}

export function BriefFunnelView({ brief }: BriefFunnelViewProps) {
  const allAds = useMemo(() => allAdsForBrief(brief), [brief]);
  const [selected, setSelected] = useState<NodeSelection>({ type: "campaign", id: "campaign" });
  const details = selectedDetails(brief, selected, allAds);
  const platform = value(brief.campaign.platform, "Platform");

  return (
    <section className="pixel-window p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="pixel-label">Funnel map</p>
          <h2 className="mt-2 text-3xl font-black">{value(brief.campaign.artist, "Untitled campaign")}</h2>
          <p className="mt-1 max-w-3xl font-semibold pixel-muted">
            Big spacious map. Click campaign, ad set, ad, or destination to inspect without showing every field at once.
          </p>
        </div>
        <span className="pixel-flow-chip">{platform}</span>
      </div>

      <div className="mt-5 grid gap-5 2xl:grid-cols-[1fr_380px]">
        <div className="pixel-flow-canvas pixel-card p-4">
          <div className="pixel-flow-inner">
            <div className="pixel-flow-grid">
              <div className="pixel-flow-heading pixel-label">Campaign / context</div>
              <div className="pixel-flow-heading pixel-label">Audience / ad set</div>
              <div className="pixel-flow-heading pixel-label">Content / ads</div>
              <div className="pixel-flow-heading pixel-label">Destination</div>
              <div className="pixel-flow-heading pixel-label">Outcome</div>

              <div className="pixel-flow-cell first-col" style={{ gridRow: `2 / span ${Math.max(brief.ad_sets.length, 1)}` }}>
                <button
                  type="button"
                  onClick={() => setSelected({ type: "campaign", id: "campaign" })}
                  className={`pixel-node pixel-node-accent min-h-40 w-full p-5 text-left ${selected.type === "campaign" ? "pixel-node-active" : ""}`}
                >
                  <span className="pixel-label block">Campaign</span>
                  <strong className="mt-3 block text-2xl leading-tight">{value(brief.campaign.artist)}</strong>
                  <span className="mt-3 block text-sm font-black uppercase tracking-[0.08em]">
                    {truncate(nodeSummaryForPlatform(brief), "Objective missing", 54)}
                  </span>
                  <span className="mt-3 block text-xs font-bold">ACID {value(brief.campaign.acid, "missing")}</span>
                </button>
              </div>

              {brief.ad_sets.length === 0 ? (
                <div className="pixel-flow-cell">
                  <div className="pixel-node w-full p-5 text-left">
                    <span className="pixel-label block">No ad sets yet</span>
                    <strong className="mt-2 block text-lg">Add audience blocks in edit mode</strong>
                  </div>
                </div>
              ) : null}

              {brief.ad_sets.map((adSet, adSetIndex) => {
                const adsForSet = uniqueAdsForAdSet(brief, adSet, allAds);
                const primaryAd = adsForSet[0];
                const primaryAdIndex = primaryAd ? allAds.findIndex((ad) => sameAd(ad, primaryAd)) : -1;
                const destination = primaryAd?.destination_url || null;

                return (
                  <div key={`${adSet.label || "adset"}-${adSetIndex}`} className="contents">
                    <div className="pixel-flow-cell">
                      <button
                        type="button"
                        onClick={() => setSelected({ type: "adset", id: String(adSetIndex) })}
                        className={`pixel-node min-h-28 w-full p-4 text-left ${selected.type === "adset" && selected.id === String(adSetIndex) ? "pixel-node-active" : ""}`}
                      >
                        <span className="pixel-label block">Ad set {adSetIndex + 1}</span>
                        <strong className="mt-2 block text-xl leading-tight">{value(adSet.label, `Ad set ${adSetIndex + 1}`)}</strong>
                        <span className="mt-3 block text-xs font-bold uppercase tracking-[0.08em]">
                          {adsForSet.length} ads assigned
                        </span>
                      </button>
                    </div>

                    <div className="pixel-flow-cell">
                      {adsForSet.length > 1 ? <span className="pixel-flow-joiner" /> : null}
                      <div className="grid w-full gap-3">
                        {adsForSet.length === 0 ? (
                          <div className="pixel-node w-full p-4 text-left">
                            <span className="pixel-label block">No ads</span>
                            <strong className="mt-2 block text-sm">Assign ads in edit mode</strong>
                          </div>
                        ) : null}
                        {adsForSet.map((ad, index) => {
                          const allAdIndex = allAds.findIndex((candidate) => sameAd(candidate, ad));
                          const safeIndex = allAdIndex >= 0 ? allAdIndex : index;
                          return (
                            <button
                              key={`${adKey(ad, index)}-${adSetIndex}`}
                              type="button"
                              onClick={() => setSelected({ type: "ad", id: String(safeIndex) })}
                              className={`pixel-node p-4 text-left ${selected.type === "ad" && selected.id === String(safeIndex) ? "pixel-node-active" : ""}`}
                            >
                              <span className="pixel-label block">Ad</span>
                              <strong className="mt-1 block text-base leading-tight">{value(ad.label || ad.release_title, `Ad ${index + 1}`)}</strong>
                              <span className="mt-2 inline-flex pixel-flow-chip">{value(ad.asset_type, "asset")}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pixel-flow-cell">
                      <button
                        type="button"
                        disabled={!primaryAd}
                        onClick={() => primaryAdIndex >= 0 && setSelected({ type: "destination", id: String(primaryAdIndex) })}
                        className={`pixel-node min-h-24 w-full p-4 text-left disabled:cursor-not-allowed ${selected.type === "destination" && selected.id === String(primaryAdIndex) ? "pixel-node-active" : ""}`}
                      >
                        <span className="pixel-label block">Destination</span>
                        <strong className="mt-2 block break-words text-sm leading-tight">
                          {truncate(destination, "No destination yet", 70)}
                        </strong>
                      </button>
                    </div>

                    <div className="pixel-flow-cell">
                      <div className="pixel-node pixel-node-soft min-h-24 w-full p-4 text-left">
                        <span className="pixel-label block">Result</span>
                        <strong className="mt-2 block text-base leading-tight">
                          {brief.campaign.platform === "TikTok" ? "Video views / spark activity" : "Clicks / conversions / audience pool"}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="pixel-detail-panel p-5">
          <span className="pixel-label block">Selected info</span>
          {details.kind === "campaign" ? (
            <div className="mt-4 grid gap-3 text-sm font-semibold">
              <h3 className="text-2xl font-black">{value(brief.campaign.release_title, "Campaign setup")}</h3>
              <p><strong>Platform:</strong> {value(brief.campaign.platform)}</p>
              <p><strong>Account:</strong> {value(brief.campaign.account, "No account yet")}</p>
              <p><strong>ACID:</strong> {value(brief.campaign.acid, "Missing")}</p>
              <p><strong>Budget:</strong> {value(brief.budget.amount, "Missing")} {value(brief.budget.currency, "")}</p>
              <p><strong>Territory:</strong> {value(brief.campaign.territory_summary, "Unknown")}</p>
              {brief.campaign.campaign_notes ? <p className="whitespace-pre-wrap border-t-[3px] border-black pt-3">{brief.campaign.campaign_notes}</p> : null}
            </div>
          ) : null}

          {details.kind === "adset" && details.adSet ? (
            <div className="mt-4 grid gap-3 text-sm font-semibold">
              <h3 className="text-2xl font-black">{value(details.adSet.label, "Untitled ad set")}</h3>
              <p className="whitespace-pre-wrap">{value(details.adSet.targeting_details || details.adSet.notes, "No targeting notes yet.")}</p>
              <p><strong>Budget:</strong> {details.adSet.budget_amount ? `${details.adSet.budget_amount} ${value(details.adSet.budget_type, "")}` : "Campaign level"}</p>
            </div>
          ) : null}

          {(details.kind === "ad" || details.kind === "destination") && details.ad ? (
            <div className="mt-4 grid gap-3 text-sm font-semibold">
              <h3 className="text-2xl font-black">{value(details.ad.label || details.ad.release_title, "Untitled ad")}</h3>
              <p><strong>Asset:</strong> {value(details.ad.asset_type, "Unknown asset type")}</p>
              <p className="whitespace-pre-wrap"><strong>Copy:</strong> {value(details.ad.copy, "No copy yet.")}</p>
              <p className="break-words"><strong>Destination:</strong> {value(details.ad.destination_url, "No destination link yet.")}</p>
              {details.ad.asset_links.length > 0 ? (
                <div className="grid gap-1 border-t-[3px] border-black pt-3">
                  {details.ad.asset_links.map((link) => <p key={link} className="break-words font-mono text-xs">{link}</p>)}
                </div>
              ) : null}
              <p><strong>Sent to:</strong> {adSetsForAd(brief, details.ad).map((adSet) => value(adSet.label, "Untitled")).join(", ") || "ad assignment unknown"}</p>
              {details.ad.notes ? <p>{details.ad.notes}</p> : null}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
