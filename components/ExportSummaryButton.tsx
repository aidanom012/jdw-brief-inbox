"use client";

import { useState } from "react";
import type { BriefRow } from "@/lib/db";

function clean(value: string | number | null | undefined, fallback = "TBC") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function campaignSummary(brief: BriefRow): string {
  const raw = brief.raw_json;
  const lines = [
    `JDW campaign summary`,
    `Artist: ${clean(raw.campaign.artist)}`,
    `Project: ${clean(raw.campaign.release_title)}`,
    `Platform: ${clean(raw.campaign.platform)}`,
    `Account: ${clean(raw.campaign.account)}`,
    `ACID: ${clean(raw.campaign.acid)}`,
    `Objective: ${clean(raw.campaign.objective)}`,
    `Campaign type: ${clean(raw.campaign.campaign_type)}`,
    `Tracking: ${[raw.campaign.conversion_location, raw.campaign.optimisation_event, raw.campaign.pixel].filter(Boolean).join(" / ") || "TBC"}`,
    `Budget: ${[raw.budget.currency, raw.budget.amount, raw.budget.type].filter((item) => item !== null && item !== undefined).join(" ") || "TBC"}`,
    `Dates: ${[raw.campaign.start_date, raw.campaign.end_date].filter(Boolean).join(" → ") || "TBC"}`,
    `Territory: ${clean(raw.campaign.territory_summary)}`,
    "",
    `Ad sets:`
  ];

  raw.ad_sets.forEach((adSet, index) => {
    lines.push(`- ${index + 1}. ${clean(adSet.label, `Ad set ${index + 1}`)}`);
    const notes = adSet.targeting_details || adSet.notes;
    if (notes) lines.push(`  Targeting/notes: ${notes}`);
    if (adSet.budget_amount) lines.push(`  Budget: ${adSet.budget_amount} ${adSet.budget_type || ""}`.trim());
    const assignedAds = adSet.ads && adSet.ads.length > 0 ? adSet.ads : raw.ads;
    assignedAds.forEach((ad) => {
      lines.push(`  • ${clean(ad.label || ad.release_title, "Ad")}`);
      if (ad.copy) lines.push(`    Copy: ${ad.copy}`);
      if (ad.destination_url) lines.push(`    Destination: ${ad.destination_url}`);
      if (ad.asset_links?.length) lines.push(`    Assets: ${ad.asset_links.join(" | ")}`);
      if (ad.post_url) lines.push(`    Post: ${ad.post_url}`);
      if (ad.boost_code) lines.push(`    Boost/Spark: ${ad.boost_code}`);
    });
  });

  if (raw.campaign.campaign_notes) {
    lines.push("", `Notes: ${raw.campaign.campaign_notes}`);
  }

  if (brief.missing_required_fields.length > 0) {
    lines.push("", `Missing/TBC: ${brief.missing_required_fields.join(", ")}`);
  }

  return lines.join("\n");
}

export function ExportSummaryButton({ brief }: { brief: BriefRow }) {
  const [copied, setCopied] = useState(false);
  const summary = campaignSummary(brief);

  function downloadSummary() {
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${clean(brief.artist, "jdw")}-${clean(brief.release_title, "campaign")}-summary.txt`.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="mini-button focus-ring px-4 py-3"
        onClick={async () => {
          await navigator.clipboard.writeText(summary);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? "Copied" : "Copy summary"}
      </button>
      <button type="button" className="mini-button focus-ring px-4 py-3" onClick={downloadSummary}>
        Export txt
      </button>
    </div>
  );
}
