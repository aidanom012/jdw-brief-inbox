"use client";

import { useMemo, useState } from "react";
import type { JDWAd, JDWAdSet, JDWCampaignBrief } from "@/lib/brief-schema";

type NodeSelection =
  | { type: "campaign"; id: "campaign" }
  | { type: "adset"; id: string }
  | { type: "ad"; id: string };

type BriefFunnelViewProps = {
  brief: JDWCampaignBrief;
};

function value(value: string | number | null | undefined, fallback = "Unknown"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function adKey(ad: JDWAd, index: number): string {
  return `${ad.label || ad.release_title || "ad"}-${index}`;
}

function allAdsForBrief(brief: JDWCampaignBrief): JDWAd[] {
  const flatAds = brief.ads || [];
  const nested = brief.ad_sets.flatMap((adSet) => adSet.ads || []);
  return flatAds.length > 0 ? flatAds : nested;
}

function uniqueAdsForAdSet(brief: JDWCampaignBrief, adSet: JDWAdSet): JDWAd[] {
  if ((adSet.ads || []).length > 0) return adSet.ads || [];
  return allAdsForBrief(brief);
}

function adSetsForAd(brief: JDWCampaignBrief, ad: JDWAd): JDWAdSet[] {
  return brief.ad_sets.filter((adSet) => {
    if ((adSet.ads || []).length === 0) return true;
    return (adSet.ads || []).some((nestedAd) =>
      nestedAd.label === ad.label &&
      nestedAd.asset_type === ad.asset_type &&
      nestedAd.destination_url === ad.destination_url &&
      nestedAd.copy === ad.copy
    );
  });
}

function selectedDetails(brief: JDWCampaignBrief, selected: NodeSelection, allAds: JDWAd[]) {
  if (selected.type === "campaign") return { kind: "campaign" as const };
  if (selected.type === "adset") return { kind: "adset" as const, adSet: brief.ad_sets[Number(selected.id)] };
  return { kind: "ad" as const, ad: allAds[Number(selected.id)] };
}

export function BriefFunnelView({ brief }: BriefFunnelViewProps) {
  const allAds = useMemo(() => allAdsForBrief(brief), [brief]);
  const [selected, setSelected] = useState<NodeSelection>({ type: "campaign", id: "campaign" });
  const details = selectedDetails(brief, selected, allAds);

  return (
    <section className="pixel-window p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="pixel-label">Campaign map</p>
          <h2 className="mt-2 text-3xl font-black">{value(brief.campaign.artist, "Untitled campaign")}</h2>
          <p className="mt-1 font-semibold pixel-muted">Big node view. Click any box to open the clean detail panel.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="pixel-flow-canvas pixel-card p-5">
          <div className="pixel-flow-inner grid grid-cols-[260px_1fr] gap-16">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setSelected({ type: "campaign", id: "campaign" })}
                className={`pixel-node min-h-48 w-full p-5 text-left ${selected.type === "campaign" ? "pixel-node-active" : ""}`}
              >
                <span className="pixel-label block">Campaign</span>
                <strong className="mt-3 block text-3xl leading-none">{value(brief.campaign.artist)}</strong>
                <span className="mt-3 block text-sm font-black uppercase tracking-[0.08em]">{value(brief.campaign.objective)}</span>
                <span className="mt-2 block text-xs font-bold">{value(brief.campaign.platform)} · ACID {value(brief.campaign.acid, "missing")}</span>
              </button>
            </div>

            <div className="grid gap-10">
              {brief.ad_sets.map((adSet, adSetIndex) => {
                const adsForSet = uniqueAdsForAdSet(brief, adSet);
                return (
                  <div key={`${adSet.label || "adset"}-${adSetIndex}`} className="pixel-flow-row grid grid-cols-[280px_1fr] items-center gap-16">
                    <button
                      type="button"
                      onClick={() => setSelected({ type: "adset", id: String(adSetIndex) })}
                      className={`pixel-node min-h-32 p-4 text-left ${selected.type === "adset" && selected.id === String(adSetIndex) ? "pixel-node-active" : ""}`}
                    >
                      <span className="pixel-label block">Ad set {adSetIndex + 1}</span>
                      <strong className="mt-2 block text-xl">{value(adSet.label, `Ad set ${adSetIndex + 1}`)}</strong>
                      <span className="mt-2 block text-xs font-bold">{adsForSet.length} ads assigned</span>
                    </button>

                    <div className="pixel-ad-strip grid grid-cols-2 gap-3">
                      {adsForSet.map((ad, index) => {
                        const allAdIndex = allAds.findIndex((candidate) => candidate === ad);
                        const safeIndex = allAdIndex >= 0 ? allAdIndex : index;
                        return (
                          <button
                            key={`${adKey(ad, index)}-${adSetIndex}`}
                            type="button"
                            onClick={() => setSelected({ type: "ad", id: String(safeIndex) })}
                            className={`pixel-node p-3 text-left ${selected.type === "ad" && selected.id === String(safeIndex) ? "pixel-node-active" : ""}`}
                          >
                            <span className="pixel-label block">Ad</span>
                            <strong className="mt-1 block text-sm">{value(ad.label || ad.release_title, `Ad ${index + 1}`)}</strong>
                            <span className="mt-1 block text-xs font-bold">{value(ad.asset_type)}</span>
                          </button>
                        );
                      })}
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
              {brief.campaign.campaign_notes ? <p className="whitespace-pre-wrap border-t-4 border-black pt-3">{brief.campaign.campaign_notes}</p> : null}
            </div>
          ) : null}

          {details.kind === "adset" && details.adSet ? (
            <div className="mt-4 grid gap-3 text-sm font-semibold">
              <h3 className="text-2xl font-black">{value(details.adSet.label, "Untitled ad set")}</h3>
              <p className="whitespace-pre-wrap">{value(details.adSet.targeting_details || details.adSet.notes, "No targeting notes yet.")}</p>
              <p><strong>Budget:</strong> {details.adSet.budget_amount ? `${details.adSet.budget_amount} ${value(details.adSet.budget_type, "")}` : "Campaign level"}</p>
            </div>
          ) : null}

          {details.kind === "ad" && details.ad ? (
            <div className="mt-4 grid gap-3 text-sm font-semibold">
              <h3 className="text-2xl font-black">{value(details.ad.label || details.ad.release_title, "Untitled ad")}</h3>
              <p><strong>Asset:</strong> {value(details.ad.asset_type, "Unknown asset type")}</p>
              <p className="whitespace-pre-wrap"><strong>Copy:</strong> {value(details.ad.copy, "No copy yet.")}</p>
              <p className="break-words"><strong>Destination:</strong> {value(details.ad.destination_url, "No destination link yet.")}</p>
              {details.ad.asset_links.length > 0 ? (
                <div className="grid gap-1 border-t-4 border-black pt-3">
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
