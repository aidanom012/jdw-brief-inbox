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
  const fallbackToken = cleanToken(fallback, "unknown-territory");

  if (locations.length === 0) {
    return normalizeTerritory(fallbackToken);
  }

  const normalized = locations.map((location) => location.toLowerCase());
  if (normalized.some((location) => location === "uk" || location.includes("united kingdom"))) {
    return "gb";
  }

  if (locations.length === 1) {
    return normalizeTerritory(cleanToken(locations[0], "territory"));
  }

  return "int";
}

function normalizeTerritory(value: string): string {
  const aliases: Record<string, string> = {
    uk: "gb",
    united: "gb",
    "united-kingdom": "gb",
    britain: "gb",
    france: "fr",
    germany: "de",
    switzerland: "ch",
    canada: "ca",
    australia: "au",
    "united-states": "us",
    usa: "us"
  };

  return aliases[value] || value;
}

function campaignTerritoryToken(brief: JDWCampaignBrief): string {
  if (brief.ad_sets.some((adSet) => adSet.locations.length > 1)) {
    return "int";
  }

  const source =
    brief.campaign.territory_summary ||
    brief.ad_sets.find((adSet) => adSet.locations.length > 0)?.locations[0] ||
    "territory";
  const normalized = cleanToken(source, "territory");

  if (["gb", "uk", "united-kingdom"].includes(normalized)) return "uk";
  return normalizeTerritory(normalized);
}

function objectiveToken(value: string | null | undefined): string {
  const normalized = (value || "").toLowerCase();

  if (normalized.includes("stream") || normalized.includes("dsp")) return "str";
  if (normalized.includes("pre-save") || normalized.includes("presave")) return "prs";
  if (normalized.includes("sale") || normalized.includes("purchase") || normalized.includes("ecom")) return "sale";
  if (normalized.includes("tour") || normalized.includes("ticket")) return "tour";
  if (normalized.includes("lead") || normalized.includes("sign up") || normalized.includes("signup")) return "lead";
  if (normalized.includes("follow")) return "foll";
  if (normalized.includes("thru") || normalized.includes("video") || normalized.includes("view")) return "vv";
  if (normalized.includes("aware") || normalized.includes("reach")) return "awr";
  if (normalized.includes("traffic") || normalized.includes("landing page") || normalized.includes("lpv")) return "traf";
  if (normalized.includes("engage") || normalized.includes("profile")) return "eng";

  return cleanToken(value, "objective");
}

function formatToken(value: string | null | undefined): string {
  const normalized = (value || "").toLowerCase();

  if (normalized.includes("spark") || normalized.includes("ugc")) return "ugc";
  if (normalized.includes("video")) return "vid";
  if (normalized.includes("image")) return "img";
  if (normalized.includes("carousel")) return "caro";

  return cleanToken(value, "format");
}

function mechanismToken(value: string | null | undefined): string {
  if (value === "interest") return "int";
  if (value === "lookalike") return "lal";
  if (value === "retargeting") return "rtg";
  if (value === "advantage_plus") return "advplus";
  if (value === "broad") return "broad";

  return cleanToken(value, "mechanism");
}

function temperatureToken(targetingType: string | null | undefined, details: string | null | undefined): string {
  const detailsText = (details || "").toLowerCase();

  if (targetingType === "retargeting" || detailsText.includes("engager") || detailsText.includes("warm")) {
    return "warm";
  }
  if (detailsText.includes("purchaser") || detailsText.includes("hot")) {
    return "hot";
  }

  return "cold";
}

export function suggestedCampaignName(brief: JDWCampaignBrief): string {
  const artist = cleanToken(brief.campaign.artist, "artist");
  const project = cleanToken(brief.campaign.release_title || brief.campaign.campaign_type, "project");
  const objective = objectiveToken(brief.campaign.objective || brief.campaign.campaign_type);
  const territory = campaignTerritoryToken(brief);
  const acid = brief.campaign.acid ? `_acid-${cleanToken(brief.campaign.acid, "missing")}` : "";

  return `${artist}_${project}_${objective}_${territory}${acid}`;
}

export function suggestedAdSetNames(brief: JDWCampaignBrief): string[] {
  return brief.ad_sets.map((adSet, index) => {
    const temperature = temperatureToken(adSet.targeting_type, adSet.targeting_details);
    const mechanism = mechanismToken(adSet.targeting_type);
    const stack = cleanToken(adSet.targeting_details || adSet.label || adSet.targeting_type, `audience-${index + 1}`);
    const geo = territoryToken(adSet.locations, brief.campaign.territory_summary);
    const gender = adSet.gender === "female" ? "w" : adSet.gender === "male" ? "m" : "all";
    const ages =
      adSet.age_min !== null && adSet.age_max !== null ? `${adSet.age_min}-${adSet.age_max}` : "age";

    return `${temperature}_${mechanism}_${stack}_${geo}_${gender}-${ages}`;
  });
}

export function suggestedAdNames(brief: JDWCampaignBrief): string[] {
  return brief.ads.map((ad, index) => {
    const assetType = formatToken(ad.asset_type);
    const release = cleanToken(ad.release_title || brief.campaign.release_title, "release");
    const descriptor = cleanToken(ad.label || ad.notes, `ad-${index + 1}`);

    return `${assetType}_${release}_${descriptor}_v1`;
  });
}
