import type { JDWCampaignBrief } from "@/lib/brief-schema";

function cleanToken(value: string | null | undefined, fallback: string): string {
  const normalized = (value || fallback)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function territoryToken(locations: string[], fallback: string | null | undefined): string {
  if (locations.length === 0) {
    return cleanToken(fallback, "unknown-territory");
  }

  const normalized = locations.map((location) => location.toLowerCase());
  if (normalized.some((location) => location === "uk" || location.includes("united kingdom"))) {
    return "uk";
  }

  if (locations.length === 1) {
    return cleanToken(locations[0], "territory");
  }

  return `${cleanToken(locations[0], "territory")}-plus-${locations.length - 1}`;
}

function placementToken(placements: string[]): string {
  if (placements.length === 0) {
    return "placements";
  }

  const aliases: Record<string, string> = {
    instagram: "ig",
    facebook: "fb",
    tiktok: "tt",
    youtube: "yt",
    reels: "reels",
    stories: "stories"
  };

  return placements
    .map((placement) => {
      const cleaned = cleanToken(placement, "placement");
      return aliases[cleaned] || cleaned;
    })
    .join("-");
}

export function suggestedCampaignName(brief: JDWCampaignBrief): string {
  const artist = cleanToken(brief.campaign.artist, "artist");
  const platform = cleanToken(brief.campaign.platform, "platform");
  const objective = cleanToken(brief.campaign.objective, "objective");
  const acid = brief.campaign.acid?.trim() || "missing";

  return `${artist}_${platform}_${objective}_ACID:${acid}`;
}

export function suggestedAdSetNames(brief: JDWCampaignBrief): string[] {
  return brief.ad_sets.map((adSet, index) => {
    const targetingType =
      adSet.targeting_type === "interest" ? "int" : cleanToken(adSet.targeting_type, "targeting");
    const summary = cleanToken(adSet.label || adSet.targeting_details || adSet.targeting_type, `ad-set-${index + 1}`);
    const ages =
      adSet.age_min !== null && adSet.age_max !== null ? `${adSet.age_min}-${adSet.age_max}` : "age";
    const territory = territoryToken(adSet.locations, brief.campaign.territory_summary);
    const placements = placementToken(adSet.placements);

    return `${targetingType}_${summary}_${ages}_${territory}_${placements}`;
  });
}

export function suggestedAdNames(brief: JDWCampaignBrief): string[] {
  return brief.ads.map((ad, index) => {
    const assetType = cleanToken(ad.asset_type, "asset");
    const release = cleanToken(ad.release_title || brief.campaign.release_title, "release");
    const descriptor = cleanToken(ad.label || ad.notes, `ad-${index + 1}`);

    return `${assetType}_${release}_${descriptor}`;
  });
}
