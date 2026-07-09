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

function adSetKey(adSet: JDWAdSet, index: number): string {
  return `${adSet.label || "adset"}-${index}`;
}

function allAdsForBrief(brief: JDWCampaignBrief): JDWAd[] {
  const flatAds = brief.ads || [];
  const nested = brief.ad_sets.flatMap((adSet) => adSet.ads || []);
  return flatAds.length > 0 ? flatAds : nested;
}

function adSetsForAd(brief: JDWCampaignBrief, ad: JDWAd): JDWAdSet[] {
  return brief.ad_sets.filter((adSet) =>
    (adSet.ads || []).some((nestedAd) =>
      nestedAd.label === ad.label &&
      nestedAd.asset_type === ad.asset_type &&
      nestedAd.destination_url === ad.destination_url &&
      nestedAd.copy === ad.copy
    )
  );
}

export function BriefFunnelView({ brief }: BriefFunnelViewProps) {
  const allAds = useMemo(() => allAdsForBrief(brief), [brief]);
  const [selected, setSelected] = useState<NodeSelection>({ type: "campaign", id: "campaign" });

  const selectedAdSetIndex = selected.type === "adset" ? Number(selected.id) : -1;
  const selectedAdIndex = selected.type === "ad" ? Number(selected.id) : -1;
  const selectedAdSet = selectedAdSetIndex >= 0 ? brief.ad_sets[selectedAdSetIndex] : null;
  const selectedAd = selectedAdIndex >= 0 ? allAds[selectedAdIndex] : null;
  const adsInSelectedAdSet = selectedAdSet ? selectedAdSet.ads || [] : [];
  const selectedAdSets = selectedAd ? adSetsForAd(brief, selectedAd) : [];

  return (
    <section className="pixel-window p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="pixel-label">Campaign funnel</p>
          <h2 className="mt-2 text-3xl font-black">{value(brief.campaign.artist, "Untitled campaign")}</h2>
          <p className="mt-1 font-semibold pixel-muted">Click any box to open the useful details.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="pixel-card overflow-x-auto p-4">
          <div className="grid min-w-[780px] grid-cols-[190px_1fr_1fr] items-center gap-6">
            <button
              type="button"
              onClick={() => setSelected({ type: "campaign", id: "campaign" })}
              className={`pixel-node p-4 text-left ${selected.type === "campaign" ? "pixel-node-active" : ""}`}
            >
              <span className="pixel-label block">Campaign</span>
              <strong className="mt-2 block text-xl">{value(brief.campaign.artist)}</strong>
              <span className="mt-1 block text-sm">{value(brief.campaign.objective)}</span>
            </button>

            <div className="grid gap-3">
              {brief.ad_sets.map((adSet, index) => (
                <button
                  key={adSetKey(adSet, index)}
                  type="button"
                  onClick={() => setSelected({ type: "adset", id: String(index) })}
                  className={`pixel-node p-3 text-left ${selected.type === "adset" && selected.id === String(index) ? "pixel-node-active" : ""}`}
                >
                  <span className="pixel-label block">Ad set {index + 1}</span>
                  <strong className="mt-1 block">{value(adSet.label, `Ad set ${index + 1}`)}</strong>
                  <span className="mt-1 block text-xs">{(adSet.ads || []).length} ads assigned</span>
                </button>
              ))}
            </div>

            <div className="grid gap-3">
              {allAds.map((ad, index) => (
                <button
                  key={adKey(ad, index)}
                  type="button"
                  onClick={() => setSelected({ type: "ad", id: String(index) })}
                  className={`pixel-node p-3 text-left ${selected.type === "ad" && selected.id === String(index) ? "pixel-node-active" : ""}`}
                >
                  <span className="pixel-label block">Ad {index + 1}</span>
                  <strong className="mt-1 block">{value(ad.label || ad.release_title, `Ad ${index + 1}`)}</strong>
                  <span className="mt-1 block text-xs">{value(ad.asset_type)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="pixel-card p-4">
          <span className="pixel-label block">Open panel</span>
          {selected.type === "campaign" ? (
            <div className="mt-3 grid gap-2 text-sm font-semibold">
              <h3 className="text-2xl font-black">{value(brief.campaign.release_title, "Campaign setup")}</h3>
              <p>{value(brief.campaign.platform)} · {value(brief.campaign.account, "No account yet")}</p>
              <p>ACID: {value(brief.campaign.acid, "Missing")}</p>
              <p>Pixel: {value(brief.campaign.pixel, "Missing")}</p>
              <p>Budget: {value(brief.budget.amount, "Missing")} {value(brief.budget.currency, "")}</p>
              {brief.campaign.campaign_notes ? <p className="whitespace-pre-wrap">{brief.campaign.campaign_notes}</p> : null}
            </div>
          ) : null}

          {selectedAdSet ? (
            <div className="mt-3 grid gap-2 text-sm font-semibold">
              <h3 className="text-2xl font-black">{value(selectedAdSet.label, "Untitled ad set")}</h3>
              <p className="whitespace-pre-wrap">{value(selectedAdSet.targeting_details || selectedAdSet.notes, "No targeting notes yet.")}</p>
              <p>Budget: {selectedAdSet.budget_amount ? `${selectedAdSet.budget_amount} ${value(selectedAdSet.budget_type, "")}` : "Campaign level"}</p>
              <p>{adsInSelectedAdSet.length} ads will run here.</p>
              {adsInSelectedAdSet.length > 0 ? (
                <div className="mt-2 grid gap-2">
                  {adsInSelectedAdSet.map((ad, index) => (
                    <p key={adKey(ad, index)} className="border-4 border-black bg-[#f4f1e4] p-2 font-mono text-xs font-black uppercase tracking-[0.1em]">
                      {value(ad.label || ad.release_title, `Ad ${index + 1}`)}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {selectedAd ? (
            <div className="mt-3 grid gap-2 text-sm font-semibold">
              <h3 className="text-2xl font-black">{value(selectedAd.label || selectedAd.release_title, "Untitled ad")}</h3>
              <p>{value(selectedAd.asset_type, "Unknown asset type")}</p>
              <p className="whitespace-pre-wrap">{value(selectedAd.copy, "No copy yet.")}</p>
              <p className="break-words">{value(selectedAd.destination_url, "No destination link yet.")}</p>
              {selectedAd.asset_links.length > 0 ? (
                <div className="grid gap-1">
                  {selectedAd.asset_links.map((link) => <p key={link} className="break-words font-mono text-xs">{link}</p>)}
                </div>
              ) : null}
              <p>Sent to: {selectedAdSets.map((adSet) => value(adSet.label, "Untitled")).join(", ") || "ad assignment unknown / flat import"}</p>
              {selectedAd.notes ? <p>{selectedAd.notes}</p> : null}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
