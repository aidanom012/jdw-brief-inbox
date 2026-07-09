import { z } from "zod";
import { defaultStatusForMissingFields } from "@/lib/status";

const nullableString = z.string().nullable();
const nullableNumber = z.number().finite().nullable();

const platformSchema = z.enum(["Meta", "TikTok", "YouTube", "Other"]).nullable();
const budgetTypeSchema = z
  .enum(["daily", "lifetime", "campaign_total", "ad_set_level", "unknown"])
  .nullable();
const currencySchema = z.enum(["GBP", "EUR", "USD", "AUD", "CAD", "unknown"]).nullable();
const genderSchema = z.enum(["all", "male", "female", "unknown"]).nullable();
const targetingTypeSchema = z
  .enum(["broad", "interest", "lookalike", "retargeting", "advantage_plus", "unknown"])
  .nullable();
const assetTypeSchema = z.enum(["video", "image", "carousel", "spark_ad", "unknown"]).nullable();
const adSetBudgetTypeSchema = z.enum(["daily", "lifetime", "unknown"]).nullable();

export const campaignBriefSchema = z
  .object({
    brief_version: z.literal("JDW_CAMPAIGN_BRIEF_V1"),
    campaign: z
      .object({
        artist: nullableString,
        release_title: nullableString,
        acid: nullableString,
        asid: nullableString.optional(),
        platform: platformSchema,
        account: nullableString,
        objective: nullableString,
        campaign_type: nullableString,
        conversion_location: nullableString,
        optimisation_event: nullableString,
        pixel: nullableString,
        territory_summary: nullableString,
        start_date: nullableString,
        end_date: nullableString
      })
      .strict(),
    budget: z
      .object({
        type: budgetTypeSchema,
        amount: nullableNumber,
        currency: currencySchema,
        notes: nullableString
      })
      .strict(),
    ad_sets: z.array(
      z
        .object({
          label: nullableString,
          locations: z.array(z.string()),
          age_min: nullableNumber,
          age_max: nullableNumber,
          gender: genderSchema,
          placements: z.array(z.string()),
          targeting_type: targetingTypeSchema,
          targeting_details: nullableString,
          exclusions: nullableString,
          budget_amount: nullableNumber.optional(),
          budget_type: adSetBudgetTypeSchema.optional()
        })
        .strict()
    ),
    ads: z.array(
      z
        .object({
          label: nullableString,
          release_title: nullableString,
          asset_type: assetTypeSchema,
          asset_links: z.array(z.string()),
          destination_url: nullableString,
          copy: nullableString,
          notes: nullableString
        })
        .strict()
    ),
    special_notes: z.array(z.string()),
    missing_required_fields: z.array(z.string())
  })
  .strict();

export type JDWCampaignBrief = z.infer<typeof campaignBriefSchema>;

export type BriefValidationResult =
  | {
      ok: true;
      brief: JDWCampaignBrief;
      missingFields: string[];
      defaultStatus: ReturnType<typeof defaultStatusForMissingFields>;
    }
  | {
      ok: false;
      message: string;
      issues?: string[];
    };

function isPresentString(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0 && value.trim().toLowerCase() !== "unknown";
}

function isPresentArray(value: unknown[] | null | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}

function addMissing(missing: Set<string>, path: string): void {
  missing.add(path);
}

function textIncludesAny(value: string | null | undefined, terms: string[]): boolean {
  const normalized = (value || "").toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function isMetaConversionOrStreamingCampaign(brief: JDWCampaignBrief): boolean {
  if (brief.campaign.platform !== "Meta") {
    return false;
  }

  return (
    textIncludesAny(brief.campaign.objective, ["conversion", "stream", "sales"]) ||
    textIncludesAny(brief.campaign.campaign_type, ["conversion", "stream", "sales"])
  );
}

function isVideoViewCampaign(brief: JDWCampaignBrief): boolean {
  const terms = ["video view", "views", "thruplay", "awareness video"];
  return (
    textIncludesAny(brief.campaign.objective, terms) ||
    textIncludesAny(brief.campaign.campaign_type, terms) ||
    (brief.campaign.platform === "TikTok" && textIncludesAny(brief.campaign.objective, ["video"]))
  );
}

export function computeMissingFields(brief: JDWCampaignBrief): string[] {
  const missing = new Set<string>();

  if (!isPresentString(brief.campaign.artist)) addMissing(missing, "campaign.artist");
  if (!isPresentString(brief.campaign.acid)) addMissing(missing, "campaign.acid");
  if (!brief.campaign.platform) addMissing(missing, "campaign.platform");
  if (!isPresentString(brief.campaign.account)) addMissing(missing, "campaign.account");
  if (!isPresentString(brief.campaign.objective)) addMissing(missing, "campaign.objective");
  if (!isPresentString(brief.campaign.campaign_type)) addMissing(missing, "campaign.campaign_type");
  if (brief.budget.amount === null) addMissing(missing, "budget.amount");
  if (!brief.budget.currency || brief.budget.currency === "unknown") addMissing(missing, "budget.currency");
  if (!isPresentArray(brief.ad_sets)) addMissing(missing, "ad_sets");
  if (!isPresentArray(brief.ads)) addMissing(missing, "ads");

  const requiresMetaConversionFields = isMetaConversionOrStreamingCampaign(brief);
  if (requiresMetaConversionFields) {
    if (!isPresentString(brief.campaign.conversion_location)) {
      addMissing(missing, "campaign.conversion_location");
    }
    if (!isPresentString(brief.campaign.optimisation_event)) {
      addMissing(missing, "campaign.optimisation_event");
    }
    if (!isPresentString(brief.campaign.pixel)) {
      addMissing(missing, "campaign.pixel");
    }
  }

  const requiresVideoAssets = isVideoViewCampaign(brief);

  brief.ad_sets.forEach((adSet, index) => {
    if (!isPresentArray(adSet.locations)) addMissing(missing, `ad_sets[${index}].locations`);
    if (adSet.age_min === null) addMissing(missing, `ad_sets[${index}].age_min`);
    if (adSet.age_max === null) addMissing(missing, `ad_sets[${index}].age_max`);
    if (!isPresentArray(adSet.placements)) addMissing(missing, `ad_sets[${index}].placements`);
  });

  brief.ads.forEach((ad, index) => {
    if (!ad.asset_type || ad.asset_type === "unknown") addMissing(missing, `ads[${index}].asset_type`);
    if (!isPresentArray(ad.asset_links)) addMissing(missing, `ads[${index}].asset_links`);
    if (!isPresentString(ad.copy)) addMissing(missing, `ads[${index}].copy`);
    if (requiresMetaConversionFields && !isPresentString(ad.destination_url)) {
      addMissing(missing, `ads[${index}].destination_url`);
    }
    if (requiresVideoAssets && ad.asset_type !== "video" && ad.asset_type !== "spark_ad") {
      addMissing(missing, `ads[${index}].asset_type`);
    }
  });

  return Array.from(missing);
}

export function validateBriefJson(rawJson: string): BriefValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      ok: false,
      message: "Invalid JSON. Ask Claude to output JDW_CAMPAIGN_BRIEF_V1 JSON only."
    };
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("brief_version" in parsed) ||
    (parsed as { brief_version?: unknown }).brief_version !== "JDW_CAMPAIGN_BRIEF_V1"
  ) {
    return {
      ok: false,
      message: "Unsupported brief version. Expected JDW_CAMPAIGN_BRIEF_V1."
    };
  }

  const result = campaignBriefSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      message: "Brief JSON does not match the JDW_CAMPAIGN_BRIEF_V1 schema.",
      issues: result.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "root";
        return `${path}: ${issue.message}`;
      })
    };
  }

  const missingFields = computeMissingFields(result.data);

  return {
    ok: true,
    brief: result.data,
    missingFields,
    defaultStatus: defaultStatusForMissingFields(missingFields)
  };
}
