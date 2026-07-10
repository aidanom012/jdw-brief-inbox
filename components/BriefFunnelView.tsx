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
    a.post_url === b.post_url &&
    a.boost_code === b.boost_code &&
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

function DetailDrawer({ brief, details, allAds }: { brief: JDWCampaignBrief; details: ReturnType<typeof selectedDetails>; allAds: JDWAd[] }) {
  if (details.kind === "campaign") {
    return (
      <div className="detail-drawer-content">
        <div>
          <p className="pixel-label">Campaign setup</p>
          <h3>{value(brief.campaign.release_title, "Campaign setup")}</h3>
        </div>
        <div className="detail-grid">
          <p><strong>Platform</strong><span>{value(brief.campaign.platform)}</span></p>
          <p><strong>Account</strong><span>{value(brief.campaign.account, "No account yet")}</span></p>
          <p><strong>ACID</strong><span>{value(brief.campaign.acid, "Missing")}</span></p>
          <p><strong>Objective</strong><span>{value(brief.campaign.objective)}</span></p>
          <p><strong>Budget</strong><span>{value(brief.budget.amount, "Missing")} {value(brief.budget.currency, "")}</span></p>
          <p><strong>Territory</strong><span>{value(brief.campaign.territory_summary, "Unknown")}</span></p>
        </div>
        {brief.campaign.campaign_notes ? <p className="drawer-note">{brief.campaign.campaign_notes}</p> : null}
      </div>
    );
  }

  if (details.kind === "adset" && details.adSet) {
    return (
      <div className="detail-drawer-content">
        <div>
          <p className="pixel-label">Audience / ad set</p>
          <h3>{value(details.adSet.label, "Untitled ad set")}</h3>
        </div>
        <div className="detail-grid">
          <p><strong>Targeting</strong><span>{value(details.adSet.targeting_type, "unknown")}</span></p>
          <p><strong>Budget</strong><span>{details.adSet.budget_amount ? `${details.adSet.budget_amount} ${value(details.adSet.budget_type, "")}` : "Campaign level"}</span></p>
          <p><strong>Locations</strong><span>{details.adSet.locations.length ? details.adSet.locations.join(", ") : "In notes / TBC"}</span></p>
          <p><strong>Placements</strong><span>{details.adSet.placements.length ? details.adSet.placements.join(", ") : "In notes / TBC"}</span></p>
        </div>
        <p className="drawer-note">{value(details.adSet.targeting_details || details.adSet.notes, "No targeting notes yet.")}</p>
      </div>
    );
  }

  if ((details.kind === "ad" || details.kind === "destination") && details.ad) {
    return (
      <div className="detail-drawer-content">
        <div>
          <p className="pixel-label">{details.kind === "destination" ? "Destination" : "Ad / asset"}</p>
          <h3>{value(details.ad.label || details.ad.release_title, "Untitled ad")}</h3>
        </div>
        <div className="detail-grid">
          <p><strong>Asset</strong><span>{value(details.ad.asset_type, "Unknown asset type")}</span></p>
          <p><strong>Sent to</strong><span>{adSetsForAd(brief, details.ad).map((adSet) => value(adSet.label, "Untitled")).join(", ") || "Unknown"}</span></p>
          <p><strong>Destination</strong><span>{value(details.ad.destination_url, "No destination link yet")}</span></p>
          <p><strong>Copy</strong><span>{value(details.ad.copy, "No copy yet")}</span></p>
        </div>
        {details.ad.asset_links.length > 0 ? (
          <div className="drawer-link-list">
            {details.ad.asset_links.map((link) => <p key={link}>{link}</p>)}
          </div>
        ) : null}
        {details.ad.notes ? <p className="drawer-note">{details.ad.notes}</p> : null}
      </div>
    );
  }

  return null;
}

export function BriefFunnelView({ brief }: BriefFunnelViewProps) {
  const allAds = useMemo(() => allAdsForBrief(brief), [brief]);
  const [selected, setSelected] = useState<NodeSelection>({ type: "campaign", id: "campaign" });
  const details = selectedDetails(brief, selected, allAds);
  const platform = value(brief.campaign.platform, "Platform");
  const totalAds = allAds.length;
  const budgetLabel = [brief.budget.amount, brief.budget.currency, brief.budget.type].filter(Boolean).join(" / ") || "Budget TBC";

  function choose(next: NodeSelection) {
    setSelected(next);
  }

  return (
    <section className="flow-shell pixel-window p-4 sm:p-6">
      <div className="flow-header">
        <div>
          <p className="pixel-label">Build flow</p>
          <h2>{value(brief.campaign.artist, "Untitled campaign")}</h2>
          <p>{truncate(nodeSummaryForPlatform(brief), "Objective missing", 96)}</p>
        </div>
        <div className="flow-stat-grid">
          <span><strong>{platform}</strong><small>Platform</small></span>
          <span><strong>{brief.ad_sets.length}</strong><small>Ad sets</small></span>
          <span><strong>{totalAds}</strong><small>Ads</small></span>
          <span><strong>{budgetLabel}</strong><small>Budget</small></span>
        </div>
      </div>

      <div className="flow-layout">
        <button
          type="button"
          onClick={() => choose({ type: "campaign", id: "campaign" })}
          className={`flow-card flow-campaign-card ${selected.type === "campaign" ? "flow-card-active" : ""}`}
        >
          <span className="flow-eyebrow">Campaign</span>
          <strong>{value(brief.campaign.release_title || brief.campaign.artist, "Campaign setup")}</strong>
          <small>ACID {value(brief.campaign.acid, "missing")} · {value(brief.campaign.account, "account TBC")}</small>
        </button>

        <div className="flow-lanes">
          {brief.ad_sets.length === 0 ? (
            <div className="flow-lane">
              <div className="flow-card flow-empty-card">
                <span className="flow-eyebrow">Audience</span>
                <strong>No ad sets yet</strong>
                <small>Add audience blocks in edit mode</small>
              </div>
            </div>
          ) : null}

          {brief.ad_sets.map((adSet, adSetIndex) => {
            const adsForSet = uniqueAdsForAdSet(brief, adSet, allAds);
            const primaryAd = adsForSet[0];
            const primaryAdIndex = primaryAd ? allAds.findIndex((ad) => sameAd(ad, primaryAd)) : -1;
            const destination = primaryAd?.destination_url || primaryAd?.post_url || primaryAd?.boost_code || null;

            return (
              <div key={`${adSet.label || "adset"}-${adSetIndex}`} className="flow-lane">
                <button
                  type="button"
                  onClick={() => choose({ type: "adset", id: String(adSetIndex) })}
                  className={`flow-card flow-audience-card ${selected.type === "adset" && selected.id === String(adSetIndex) ? "flow-card-active" : ""}`}
                >
                  <span className="flow-eyebrow">Ad set {adSetIndex + 1}</span>
                  <strong>{value(adSet.label, `Ad set ${adSetIndex + 1}`)}</strong>
                  <small>{adsForSet.length} ads · {value(adSet.targeting_type, "targeting TBC")}</small>
                </button>

                <div className="flow-ad-stack">
                  {adsForSet.length === 0 ? (
                    <div className="flow-card flow-empty-card">
                      <span className="flow-eyebrow">Ad</span>
                      <strong>No ads assigned</strong>
                      <small>Assign ads in edit mode</small>
                    </div>
                  ) : null}
                  {adsForSet.map((ad, index) => {
                    const allAdIndex = allAds.findIndex((candidate) => sameAd(candidate, ad));
                    const safeIndex = allAdIndex >= 0 ? allAdIndex : index;
                    return (
                      <button
                        key={`${adKey(ad, index)}-${adSetIndex}`}
                        type="button"
                        onClick={() => choose({ type: "ad", id: String(safeIndex) })}
                        className={`flow-card flow-ad-card ${selected.type === "ad" && selected.id === String(safeIndex) ? "flow-card-active" : ""}`}
                      >
                        <span className="flow-eyebrow">Ad</span>
                        <strong>{value(ad.label || ad.release_title, `Ad ${index + 1}`)}</strong>
                        <small>{value(ad.asset_type, "asset")} · {truncate(ad.copy, "copy TBC", 42)}</small>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={!primaryAd}
                  onClick={() => primaryAdIndex >= 0 && choose({ type: "destination", id: String(primaryAdIndex) })}
                  className={`flow-card flow-destination-card disabled:cursor-not-allowed ${selected.type === "destination" && selected.id === String(primaryAdIndex) ? "flow-card-active" : ""}`}
                >
                  <span className="flow-eyebrow">Destination</span>
                  <strong>{truncate(destination, "Destination TBC", 56)}</strong>
                  <small>{primaryAd?.boost_code ? "Boost code present" : primaryAd?.post_url ? "Post URL present" : "Link check"}</small>
                </button>

                <div className="flow-card flow-result-card">
                  <span className="flow-eyebrow">Result</span>
                  <strong>{brief.campaign.platform === "TikTok" ? "Spark / views" : "Clicks / conversions"}</strong>
                  <small>{value(brief.campaign.optimisation_event, "optimisation TBC")}</small>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="flow-inspector">
        <div className="flow-inspector-head">
          <span className="pixel-label">Inspector</span>
          <span className="flow-chip">select any block</span>
        </div>
        <DetailDrawer brief={brief} details={details} allAds={allAds} />
      </aside>
    </section>
  );
}
