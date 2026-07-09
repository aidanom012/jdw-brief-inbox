import { z } from "zod";
import { defaultStatusForBrief } from "@/lib/status";

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
const adSetBudgetTypeSchema = z.enum(["daily", "lifetime", "campaign_total", "unknown"]).nullable();
const sourceTypeSchema = z
  .enum(["email", "handover", "paid_media_brief", "report", "quick_note", "unknown"])
  .nullable();
const buildActionSchema = z
  .enum([
    "new_campaign",
    "add_ad_set",
    "boost_post",
    "update_existing_campaign",
    "budget_change",
    "hold",
    "report_reference",
    "unknown"
  ])
  .nullable();
const buildPrioritySchema = z.enum(["urgent", "normal", "hold", "unknown"]).nullable();

const adSchema = z
  .object({
    label: nullableString,
    release_title: nullableString,
    asset_type: assetTypeSchema,
    asset_links: z.array(z.string()),
    post_url: nullableString.optional(),
    boost_code: nullableString.optional(),
    destination_url: nullableString,
    copy: nullableString,
    notes: nullableString
  })
  .strict();

const adSetSchema = z
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
    budget_type: adSetBudgetTypeSchema.optional(),
    notes: nullableString.optional(),
    ads: z.array(adSchema).optional()
  })
  .strict();

export const campaignBriefSchema = z
  .object({
    brief_version: z.literal("JDW_CAMPAIGN_BRIEF_V1"),
    source: z
      .object({
        source_type: sourceTypeSchema,
        source_title: nullableString,
        source_date: nullableString,
        original_item_label: nullableString,
        source_notes: z.array(z.string())
      })
      .strict()
      .optional(),
    build: z
      .object({
        action: buildActionSchema,
        existing_campaign_name: nullableString,
        approval_required: z.boolean().nullable(),
        launch_instruction: nullableString,
        priority: buildPrioritySchema
      })
      .strict()
      .optional(),
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
        end_date: nullableString,
        campaign_notes: nullableString.optional()
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
    ad_sets: z.array(adSetSchema),
    ads: z.array(adSchema).optional().default([]),
    special_notes: z.array(z.string()),
    missing_required_fields: z.array(z.string())
  })
  .strict();

export const campaignBriefBatchSchema = z
  .object({
    brief_version: z.literal("JDW_CAMPAIGN_BRIEF_BATCH_V1"),
    briefs: z.array(campaignBriefSchema).min(1)
  })
  .strict();

export type JDWCampaignBrief = z.infer<typeof campaignBriefSchema>;
export type JDWAd = JDWCampaignBrief["ads"][number];
export type JDWAdSet = JDWCampaignBrief["ad_sets"][number];

export type ValidatedBrief = {
  brief: JDWCampaignBrief;
  missingFields: string[];
  defaultStatus: ReturnType<typeof defaultStatusForBrief>;
};

export type BriefValidationResult =
  | {
      ok: true;
      briefs: ValidatedBrief[];
      isBatch: boolean;
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

export function adsForBrief(brief: JDWCampaignBrief): JDWAd[] {
  const flatAds = brief.ads || [];
  const nestedAds = brief.ad_sets.flatMap((adSet) => adSet.ads || []);
  return flatAds.length > 0 ? flatAds : nestedAds;
}

function hasAdAssetReference(ad: JDWAd): boolean {
  return isPresentArray(ad.asset_links) || isPresentString(ad.post_url) || isPresentString(ad.boost_code);
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
  const allAds = adsForBrief(brief);

  if (!isPresentString(brief.campaign.artist)) addMissing(missing, "campaign.artist");
  if (!isPresentString(brief.campaign.acid)) addMissing(missing, "campaign.acid");
  if (!brief.campaign.platform) addMissing(missing, "campaign.platform");
  if (!isPresentString(brief.campaign.account)) addMissing(missing, "campaign.account");
  if (!isPresentString(brief.campaign.objective)) addMissing(missing, "campaign.objective");
  if (!isPresentString(brief.campaign.campaign_type)) addMissing(missing, "campaign.campaign_type");
  if (brief.budget.amount === null) addMissing(missing, "budget.amount");
  if (!brief.budget.currency || brief.budget.currency === "unknown") addMissing(missing, "budget.currency");
  if (!isPresentArray(brief.ad_sets)) addMissing(missing, "ad_sets");
  if (!isPresentArray(allAds)) addMissing(missing, "ads");

  const requiresMetaConversionFields = isMetaConversionOrStreamingCampaign(brief);
  if (requiresMetaConversionFields) {
    if (!isPresentString(brief.campaign.conversion_location)) addMissing(missing, "campaign.conversion_location");
    if (!isPresentString(brief.campaign.optimisation_event)) addMissing(missing, "campaign.optimisation_event");
    if (!isPresentString(brief.campaign.pixel)) addMissing(missing, "campaign.pixel");
  }

  const requiresVideoAssets = isVideoViewCampaign(brief);

  brief.ad_sets.forEach((adSet, index) => {
    const hasTargetingOrNotes = isPresentString(adSet.targeting_details) || isPresentString(adSet.notes);
    if (!hasTargetingOrNotes) addMissing(missing, `ad_sets[${index}].targeting_details`);
    if ((adSet.ads || []).length === 0 && (brief.ads || []).length === 0) addMissing(missing, `ad_sets[${index}].ads`);
  });

  allAds.forEach((ad, index) => {
    if (!ad.asset_type || ad.asset_type === "unknown") addMissing(missing, `ads[${index}].asset_type`);
    if (!hasAdAssetReference(ad)) addMissing(missing, `ads[${index}].asset_links`);
    if (!isPresentString(ad.copy)) addMissing(missing, `ads[${index}].copy`);
    if (requiresMetaConversionFields && !isPresentString(ad.destination_url)) addMissing(missing, `ads[${index}].destination_url`);
    if (requiresVideoAssets && ad.asset_type !== "video" && ad.asset_type !== "spark_ad") {
      addMissing(missing, `ads[${index}].asset_type`);
    }
  });

  return Array.from(missing);
}

function normaliseBrief(brief: JDWCampaignBrief): JDWCampaignBrief {
  return {
    ...brief,
    source: brief.source || {
      source_type: null,
      source_title: null,
      source_date: null,
      original_item_label: null,
      source_notes: []
    },
    build: brief.build || {
      action: "new_campaign",
      existing_campaign_name: null,
      approval_required: null,
      launch_instruction: null,
      priority: "normal"
    },
    campaign: {
      ...brief.campaign,
      asid: brief.campaign.asid ?? null,
      campaign_notes: brief.campaign.campaign_notes ?? null
    },
    ad_sets: brief.ad_sets.map((adSet) => ({
      ...adSet,
      budget_amount: adSet.budget_amount ?? null,
      budget_type: adSet.budget_type ?? null,
      notes: adSet.notes ?? null,
      ads: adSet.ads ?? []
    })),
    ads: brief.ads || []
  };
}

function validatedBrief(brief: JDWCampaignBrief): ValidatedBrief {
  const normalisedBrief = normaliseBrief(brief);
  const missingFields = computeMissingFields(normalisedBrief);

  return {
    brief: normalisedBrief,
    missingFields,
    defaultStatus: defaultStatusForBrief(normalisedBrief, missingFields)
  };
}

export function validateBriefJson(rawJson: string): BriefValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, message: "Invalid JSON. Ask Claude to output JDW_CAMPAIGN_BRIEF_V1 JSON only." };
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("brief_version" in parsed) ||
    !["JDW_CAMPAIGN_BRIEF_V1", "JDW_CAMPAIGN_BRIEF_BATCH_V1"].includes(
      String((parsed as { brief_version?: unknown }).brief_version)
    )
  ) {
    return {
      ok: false,
      message: "Unsupported brief version. Expected JDW_CAMPAIGN_BRIEF_V1 or JDW_CAMPAIGN_BRIEF_BATCH_V1."
    };
  }

  if ((parsed as { brief_version?: unknown }).brief_version === "JDW_CAMPAIGN_BRIEF_BATCH_V1") {
    const result = campaignBriefBatchSchema.safeParse(parsed);
    if (!result.success) {
      return {
        ok: false,
        message: "Brief JSON does not match the JDW_CAMPAIGN_BRIEF_BATCH_V1 schema.",
        issues: result.error.issues.map((issue) => {
          const path = issue.path.length > 0 ? issue.path.join(".") : "root";
          return `${path}: ${issue.message}`;
        })
      };
    }

    return { ok: true, briefs: result.data.briefs.map(validatedBrief), isBatch: true };
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

  return { ok: true, briefs: [validatedBrief(result.data)], isBatch: false };
}
