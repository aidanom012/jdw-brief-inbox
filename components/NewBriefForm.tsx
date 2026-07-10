"use client";

import type {
  ChangeEvent,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { submitBriefAction, updateBriefAction } from "@/app/actions";
import {
  validateBriefJson,
  type BriefValidationResult,
  type JDWCampaignBrief,
} from "@/lib/brief-schema";
import { AiBriefPanel } from "@/components/AiBriefPanel";

const BriefFunnelView = dynamic(
  () => import("@/components/BriefFunnelView").then((mod) => mod.BriefFunnelView),
  {
    ssr: false,
    loading: () => (
      <div className="funnel-loading pixel-card p-4">
        <p className="pixel-label">Live funnel</p>
        <strong>Loading preview...</strong>
      </div>
    ),
  },
);

const MAX_JSON_FILE_LENGTH = 250_000;
const AUTOSAVE_KEY = "jdw.manualBriefDraft.v2";

type Platform = "" | "Meta" | "TikTok" | "YouTube" | "Other";
type BudgetType =
  "" | "daily" | "lifetime" | "campaign_total" | "ad_set_level" | "unknown";
type Currency = "" | "GBP" | "EUR" | "USD" | "AUD" | "CAD" | "unknown";
type AssetType = "" | "video" | "image" | "carousel" | "spark_ad" | "unknown";
type Gender = "" | "all" | "male" | "female" | "unknown";
type TargetingType =
  "" | "broad" | "interest" | "lookalike" | "retargeting" | "advantage_plus" | "unknown";

type WizardAdSet = {
  id: string;
  label: string;
  locations: string;
  age_min: string;
  age_max: string;
  gender: Gender;
  placements: string;
  targeting_type: TargetingType;
  exclusions: string;
  notes: string;
  budget_enabled: boolean;
  budget_amount: string;
  budget_type: "" | "daily" | "lifetime" | "campaign_total" | "unknown";
};

type WizardAd = {
  id: string;
  label: string;
  asset_type: AssetType;
  asset_links: string;
  post_url: string;
  boost_code: string;
  destination_url: string;
  copy: string;
  notes: string;
  assignedAdSetIds: string[];
};

type CampaignSetup = {
  artist: string;
  release_title: string;
  platform: Platform;
  account: string;
  acid: string;
  asid: string;
  objective: string;
  campaign_type: string;
  conversion_location: string;
  optimisation_event: string;
  pixel: string;
  budget_type: BudgetType;
  budget_amount: string;
  currency: Currency;
  start_date: string;
  end_date: string;
  territory_summary: string;
  campaign_notes: string;
};

type NewBriefFormProps = {
  initialBrief?: JDWCampaignBrief;
  briefId?: string;
  savedArtists?: string[];
  savedProjects?: string[];
};

type BuildMode = "choice" | "manual" | "ai";

type CampaignQueueItem = {
  id: string;
  brief: JDWCampaignBrief;
  label: string;
  slide: number;
  status: "pending" | "saved" | "skipped";
  savedId?: string;
};

type AutosaveSnapshot = {
  setup?: Partial<CampaignSetup>;
  adSets?: Partial<WizardAdSet>[];
  ads?: Partial<WizardAd>[];
  slide?: number;
  buildMode?: BuildMode;
  campaignQueue?: CampaignQueueItem[];
  activeQueueId?: string | null;
  updatedAt?: string;
};

type AutosaveContinueOption = {
  id: string;
  label: string;
  meta: string;
};

type CampaignTemplateId = "meta_streaming" | "meta_views" | "tiktok_spark";

const PLATFORM_OPTIONS = ["Meta", "TikTok", "YouTube", "Other"] as const;
const CURRENCY_OPTIONS = [
  "GBP",
  "EUR",
  "USD",
  "AUD",
  "CAD",
  "unknown",
] as const;
const BUDGET_OPTIONS = [
  "daily",
  "lifetime",
  "campaign_total",
  "ad_set_level",
  "unknown",
] as const;
const AD_SET_BUDGET_OPTIONS = [
  "daily",
  "lifetime",
  "campaign_total",
  "unknown",
] as const;
const GENDER_OPTIONS = ["all", "male", "female", "unknown"] as const;
const TARGETING_OPTIONS = [
  "broad",
  "interest",
  "lookalike",
  "retargeting",
  "advantage_plus",
  "unknown",
] as const;
const ASSET_OPTIONS = [
  "video",
  "image",
  "carousel",
  "spark_ad",
  "unknown",
] as const;

const OBJECTIVE_PRESETS = [
  "Streaming Conversions",
  "Sales",
  "Traffic / LPV",
  "Video Views / ThruPlay",
  "Awareness",
  "Followers",
  "Engagement",
];

const CAMPAIGN_TYPE_PRESETS = [
  "Engagement",
  "Sales",
  "Traffic",
  "Video Views",
  "Boost",
  "Awareness",
  "Other",
];
const CONVERSION_LOCATION_PRESETS = [
  "Website",
  "Instagram profile",
  "TikTok profile",
  "App",
  "None",
  "Unknown",
];
const OPTIMISATION_PRESETS = [
  "ViewContent",
  "FeatureFM_click",
  "Purchase",
  "Landing Page View",
  "ThruPlay",
  "15-sec engaged view",
  "Unknown",
];

const SLIDES = [
  { label: "Artist", hint: "Who is this for?" },
  { label: "Project", hint: "Track / tour / release" },
  { label: "Platform", hint: "Meta or TikTok" },
  { label: "Account", hint: "Ad account + IDs" },
  { label: "Objective", hint: "What are we buying?" },
  { label: "Pixel", hint: "Only if relevant" },
  { label: "Budget", hint: "Money + dates" },
  { label: "Notes", hint: "Anything James said" },
  { label: "Ad sets", hint: "How many audiences?" },
  { label: "Ad details", hint: "What each one targets" },
  { label: "Ads", hint: "Assets + copy" },
  { label: "Review", hint: "Save draft" },
] as const;

type BuildLevelKey = "campaign" | "adSets" | "ads" | "review";

const BUILD_LEVELS: Array<{
  key: BuildLevelKey;
  label: string;
  slide: number;
  stepRange: string;
  hint: string;
}> = [
  { key: "campaign", label: "Campaign", slide: 0, stepRange: "01", hint: "Setup" },
  { key: "adSets", label: "Ad sets", slide: 8, stepRange: "09", hint: "Audience" },
  { key: "ads", label: "Ads", slide: 10, stepRange: "11", hint: "Creative" },
  { key: "review", label: "Review", slide: 11, stepRange: "12", hint: "Save" },
];

type PlaybookGuide = {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
};

function isTikTokPlatform(platform: Platform): boolean {
  return platform === "TikTok";
}

function isMetaPlatform(platform: Platform): boolean {
  return platform === "Meta";
}

function adSetUnit(platform: Platform): { singular: string; plural: string; lower: string; lowerPlural: string } {
  return isTikTokPlatform(platform)
    ? { singular: "Ad group", plural: "Ad groups", lower: "ad group", lowerPlural: "ad groups" }
    : { singular: "Ad set", plural: "Ad sets", lower: "ad set", lowerPlural: "ad sets" };
}

function slideLabelForPlatform(slide: number, platform: Platform): string {
  if (slide === 8) return adSetUnit(platform).plural;
  if (slide === 9) return `${adSetUnit(platform).singular} details`;
  return SLIDES[slide].label;
}

function slideHintForPlatform(slide: number, platform: Platform): string {
  if (slide === 8) return isTikTokPlatform(platform) ? "How many TikTok ad groups?" : "How many Meta ad sets?";
  if (slide === 9) return isTikTokPlatform(platform) ? "Placement, targeting, budget, and optimisation." : "Audience, placements, budget, and targeting.";
  if (slide === 5 && isTikTokPlatform(platform)) return "Pixel/event if needed, or skip for Spark/video views.";
  if (slide === 5 && isMetaPlatform(platform)) return "Pixel/dataset, conversion location, and optimisation event.";
  return SLIDES[slide].hint;
}

function buildLevelForSlide(slide: number): BuildLevelKey {
  if (slide >= 11) return "review";
  if (slide >= 10) return "ads";
  if (slide >= 8) return "adSets";
  return "campaign";
}

function buildLevelLabel(level: BuildLevelKey, platform: Platform): string {
  if (level === "adSets") return adSetUnit(platform).plural;
  return BUILD_LEVELS.find((item) => item.key === level)?.label || "Campaign";
}

function playbookGuide(slide: number, platform: Platform): PlaybookGuide | null {
  if (!platform) return null;

  if (isMetaPlatform(platform)) {
    if (slide === 2) {
      return {
        eyebrow: "Meta playbook",
        title: "Meta builds use Campaign -> Ad Set -> Ad.",
        body: "The Meta guide separates campaign-level decisions, ad-set decisions, and ad-level decisions.",
        bullets: ["Campaign: name, objective, daily or total budget", "Ad set: flight time, audience, placements, budget", "Ad: format, Page/IG identity, creative and copy"],
      };
    }
    if (slide === 4) {
      return {
        eyebrow: "Campaign level",
        title: "Match the objective to what James actually wants.",
        body: "Meta objective choice controls delivery. Low-signal campaigns should move up the funnel rather than forcing a conversion objective with too little data.",
        bullets: ["Streaming click campaign = Traffic or Website conversion-style setup", "Views campaign = Video Views or ThruPlay", "Conversions need enough signal and can re-enter learning after major edits"],
      };
    }
    if (slide === 5) {
      return {
        eyebrow: "Tracking check",
        title: "Pixel/dataset only matters when the objective needs it.",
        body: "Meta conversion objectives require Pixel or CAPI. Awareness, traffic, and video-view builds may not.",
        bullets: ["Confirm conversion location", "Confirm optimisation event", "Confirm pixel/dataset name"],
      };
    }
    if (slide === 9) {
      return {
        eyebrow: "Ad set level",
        title: "This is where audience and placements live.",
        body: "Use this step for locations, age, gender, interest/custom/lookalike notes, exclusions, and placement decisions.",
        bullets: ["Targeting: geographic, demographic, interest, custom, lookalike", "Placements: automatic is the efficiency default", "Consolidate where possible to avoid stretching budget too thin"],
      };
    }
    if (slide === 10) {
      return {
        eyebrow: "Ad level",
        title: "This is where creative, page/IG, copy, and URL live.",
        body: "Keep asset links, post URLs, copy, and destination URLs attached to the exact ad they belong to.",
        bullets: ["Creative format and placement fit", "Page / Instagram post identity", "CTA, copy, destination URL, and fatigue risk"],
      };
    }
  }

  if (isTikTokPlatform(platform)) {
    if (slide === 2) {
      return {
        eyebrow: "TikTok playbook",
        title: "TikTok builds use Campaign -> Ad Group -> Ad.",
        body: "The TikTok guide separates campaign, ad group, and ad setup. The site mirrors that but still saves to the JDW ad_set structure underneath.",
        bullets: ["Campaign: objective", "Ad group: promotion type, placements, targeting, budget, bidding", "Ad: Spark/non-Spark identity, format, asset, copy, URL"],
      };
    }
    if (slide === 4) {
      return {
        eyebrow: "Campaign level",
        title: "Pick the TikTok objective first.",
        body: "For James briefs this is usually Video Views, Website Traffic, Engagement, Lead/Conversion, or Followers.",
        bullets: ["Video Views: 15-sec engaged view / view optimisation", "Website campaigns need promotion type Website", "Spark/boost work needs post URL or boost code"],
      };
    }
    if (slide === 5) {
      return {
        eyebrow: "Tracking/event check",
        title: "Skip tracking for simple view/Spark boosts unless James specifies an event.",
        body: "For website or conversion campaigns, capture promotion type, pixel/event, and destination. For video views, move on if not supplied.",
        bullets: ["Website conversions need pixel/event", "Spark/video views need post URL or boost code", "Do not invent missing tracking"],
      };
    }
    if (slide === 9) {
      return {
        eyebrow: "Ad group level",
        title: "This is the TikTok ad group setup.",
        body: "Use this step for TikTok locations, age, targeting, placements, optimisation notes, and optional ad group budget.",
        bullets: ["Ad group names must be unique inside a campaign", "Automatic placement is the recommended default", "Placements cannot be changed after the ad group is created"],
      };
    }
    if (slide === 10) {
      return {
        eyebrow: "Ad level",
        title: "Spark codes and post URLs belong here.",
        body: "Attach every boost code, TikTok post URL, asset link, identity note, copy line, and destination URL to its exact ad.",
        bullets: ["Spark or non-Spark identity", "Single video, image, carousel, playable, or collection format", "Asset/copy/destination"],
      };
    }
  }

  return null;
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function queueLabelForBrief(brief: JDWCampaignBrief, index: number): string {
  return (
    [brief.campaign.artist, brief.campaign.release_title, brief.campaign.platform]
      .filter(Boolean)
      .join(" / ") || `Campaign ${index + 1}`
  );
}

function makeCampaignQueue(briefs: JDWCampaignBrief[]): CampaignQueueItem[] {
  return briefs.map((brief, index) => ({
    id: uid("queued"),
    brief,
    label: queueLabelForBrief(brief, index),
    slide: 0,
    status: "pending" as const,
  }));
}

function blankToNull(value: string | undefined): string | null {
  const clean = (value || "").trim();
  return clean.length > 0 ? clean : null;
}

function blankToEnum<T extends string>(value: T | ""): T | null {
  return value === "" ? null : value;
}

function numberOrNull(value: string): number | null {
  const clean = value.trim();
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitList(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function newAdSet(label = ""): WizardAdSet {
  return {
    id: uid("adset"),
    label,
    locations: "",
    age_min: "",
    age_max: "",
    gender: "all",
    placements: "",
    targeting_type: "unknown",
    exclusions: "",
    notes: "",
    budget_enabled: false,
    budget_amount: "",
    budget_type: "",
  };
}

function newAd(label = "", adSetIds: string[] = []): WizardAd {
  return {
    id: uid("ad"),
    label,
    asset_type: "video",
    asset_links: "",
    post_url: "",
    boost_code: "",
    destination_url: "",
    copy: "",
    notes: "",
    assignedAdSetIds: adSetIds,
  };
}

function duplicateAdSet(adSet: WizardAdSet): WizardAdSet {
  return {
    ...adSet,
    id: uid("adset"),
    label: `${adSet.label || "Ad set"} copy`,
  };
}

function duplicateAd(ad: WizardAd): WizardAd {
  return {
    ...ad,
    id: uid("ad"),
    label: `${ad.label || "Ad"} copy`,
  };
}

const EMPTY_SETUP: CampaignSetup = {
  artist: "",
  release_title: "",
  platform: "",
  account: "",
  acid: "",
  asid: "",
  objective: "",
  campaign_type: "",
  conversion_location: "",
  optimisation_event: "",
  pixel: "",
  budget_type: "",
  budget_amount: "",
  currency: "GBP",
  start_date: "",
  end_date: "",
  territory_summary: "",
  campaign_notes: "",
};

function adToJson(ad: WizardAd, setup: CampaignSetup) {
  return {
    label: blankToNull(ad.label),
    release_title: blankToNull(ad.label || setup.release_title),
    asset_type: blankToEnum(ad.asset_type),
    asset_links: splitList(ad.asset_links),
    post_url: blankToNull(ad.post_url),
    boost_code: blankToNull(ad.boost_code),
    destination_url: blankToNull(ad.destination_url),
    copy: blankToNull(ad.copy),
    notes: blankToNull(ad.notes),
  };
}

function buildBrief(
  setup: CampaignSetup,
  adSets: WizardAdSet[],
  ads: WizardAd[],
) {
  const nestedAdSets = adSets.map((adSet) => ({
    label: blankToNull(adSet.label),
    locations: splitList(adSet.locations || ""),
    age_min: numberOrNull(adSet.age_min || ""),
    age_max: numberOrNull(adSet.age_max || ""),
    gender: blankToEnum((adSet.gender || "") as Gender),
    placements: splitList(adSet.placements || ""),
    targeting_type: blankToEnum((adSet.targeting_type || "") as TargetingType),
    targeting_details: blankToNull(adSet.notes),
    exclusions: blankToNull(adSet.exclusions),
    budget_amount: adSet.budget_enabled
      ? numberOrNull(adSet.budget_amount)
      : null,
    budget_type: adSet.budget_enabled ? blankToEnum(adSet.budget_type) : null,
    notes: blankToNull(adSet.notes),
    ads: ads
      .filter((ad) => ad.assignedAdSetIds.includes(adSet.id))
      .map((ad) => adToJson(ad, setup)),
  }));

  const flatAds = ads.map((ad) => adToJson(ad, setup));

  return {
    brief_version: "JDW_CAMPAIGN_BRIEF_V1",
    source: {
      source_type: "quick_note",
      source_title: "Manual brief builder",
      source_date: null,
      original_item_label: null,
      source_notes: [],
    },
    build: {
      action: "new_campaign",
      existing_campaign_name: null,
      approval_required: null,
      launch_instruction: null,
      priority: "normal",
    },
    campaign: {
      artist: blankToNull(setup.artist),
      release_title: blankToNull(setup.release_title),
      acid: blankToNull(setup.acid),
      asid: blankToNull(setup.asid),
      platform: blankToEnum(setup.platform),
      account: blankToNull(setup.account),
      objective: blankToNull(setup.objective),
      campaign_type: blankToNull(setup.campaign_type),
      conversion_location: blankToNull(setup.conversion_location),
      optimisation_event: blankToNull(setup.optimisation_event),
      pixel: blankToNull(setup.pixel),
      territory_summary: blankToNull(setup.territory_summary),
      start_date: blankToNull(setup.start_date),
      end_date: blankToNull(setup.end_date),
      campaign_notes: blankToNull(setup.campaign_notes),
    },
    budget: {
      type: blankToEnum(setup.budget_type),
      amount: numberOrNull(setup.budget_amount),
      currency: blankToEnum(setup.currency),
      notes: null,
    },
    ad_sets: nestedAdSets,
    ads: flatAds,
    special_notes: setup.campaign_notes.trim()
      ? [setup.campaign_notes.trim()]
      : [],
    missing_required_fields: [],
  };
}

function FieldShell({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="pixel-label">{label}</span>
      <div className="mt-2">{children}</div>
      {hint ? (
        <span className="mt-1 block text-xs font-semibold pixel-muted">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className || ""}`} />;
}

function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`field min-h-24 resize-y ${props.className || ""}`}
    />
  );
}

function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`field ${props.className || ""}`} />;
}

function DataList({ id, options }: { id: string; options: string[] }) {
  return (
    <datalist id={id}>
      {options.map((option) => (
        <option key={option} value={option} />
      ))}
    </datalist>
  );
}

function JsonImportPanel({
  onImported,
}: {
  onImported: (json: string, validation: BriefValidationResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rawJson, setRawJson] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function validateAndImport(value: string) {
    const validation = validateBriefJson(value);
    if (!validation.ok) {
      setMessage(validation.message);
      return;
    }
    onImported(value, validation);
    setMessage("JSON validated. Save it from this review screen.");
  }

  async function importJsonFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_JSON_FILE_LENGTH) {
      setMessage("JSON file is too large.");
      return;
    }
    const importedJson = await file.text();
    setRawJson(importedJson);
    validateAndImport(importedJson);
  }

  return (
    <section className="pixel-card p-4">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="pixel-label block">Optional JSON import</span>
          <span className="mt-1 block text-sm font-medium pixel-muted">
            Manual build is the main flow. JSON paste is only a shortcut.
          </span>
        </span>
        <span className="mini-button">{open ? "close" : "open"}</span>
      </button>
      {open ? (
        <div className="mt-4 grid gap-3">
          <textarea
            value={rawJson}
            onChange={(event) => setRawJson(event.target.value)}
            className="field min-h-52 font-mono text-xs"
            spellCheck={false}
            placeholder='{"brief_version":"JDW_CAMPAIGN_BRIEF_V1", ...}'
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => validateAndImport(rawJson)}
              className="pixel-button text-xs"
            >
              Validate JSON
            </button>
            <label className="mini-button cursor-pointer px-4 py-3">
              Import file
              <input
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={importJsonFile}
              />
            </label>
          </div>
          {message ? (
            <p className="pixel-alert p-3 text-sm">{message}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function fitAdSetCount(current: WizardAdSet[], count: number): WizardAdSet[] {
  const safeCount = Math.max(1, Math.min(24, count || 1));
  if (safeCount === current.length) return current;
  if (safeCount < current.length) return current.slice(0, safeCount);
  return [
    ...current,
    ...Array.from({ length: safeCount - current.length }, (_, index) =>
      newAdSet(`Ad set ${current.length + index + 1}`),
    ),
  ];
}

function briefToBuilderState(brief?: JDWCampaignBrief): {
  setup: CampaignSetup;
  adSets: WizardAdSet[];
  ads: WizardAd[];
} {
  if (!brief) {
    const firstAdSet = newAdSet("Ad set 1");
    return {
      setup: EMPTY_SETUP,
      adSets: [firstAdSet],
      ads: [newAd("Ad 1", [firstAdSet.id])],
    };
  }

  const setup: CampaignSetup = {
    artist: brief.campaign.artist || "",
    release_title: brief.campaign.release_title || "",
    platform: (brief.campaign.platform || "") as Platform,
    account: brief.campaign.account || "",
    acid: brief.campaign.acid || "",
    asid: brief.campaign.asid || "",
    objective: brief.campaign.objective || "",
    campaign_type: brief.campaign.campaign_type || "",
    conversion_location: brief.campaign.conversion_location || "",
    optimisation_event: brief.campaign.optimisation_event || "",
    pixel: brief.campaign.pixel || "",
    budget_type: (brief.budget.type || "") as BudgetType,
    budget_amount:
      brief.budget.amount === null ? "" : String(brief.budget.amount),
    currency: (brief.budget.currency || "") as Currency,
    start_date: brief.campaign.start_date || "",
    end_date: brief.campaign.end_date || "",
    territory_summary: brief.campaign.territory_summary || "",
    campaign_notes:
      brief.campaign.campaign_notes || brief.special_notes.join("\n") || "",
  };

  const adSets: WizardAdSet[] = (
    brief.ad_sets.length
      ? brief.ad_sets
      : [
          {
            label: "Ad set 1",
            targeting_details: null,
            budget_amount: null,
            budget_type: null,
            ads: [],
          } as any,
        ]
  ).map((adSet, index) => ({
    id: uid("adset"),
    label: adSet.label || `Ad set ${index + 1}`,
    locations: (adSet.locations || []).join("\n"),
    age_min: adSet.age_min === null || adSet.age_min === undefined ? "" : String(adSet.age_min),
    age_max: adSet.age_max === null || adSet.age_max === undefined ? "" : String(adSet.age_max),
    gender: (adSet.gender || "") as Gender,
    placements: (adSet.placements || []).join("\n"),
    targeting_type: (adSet.targeting_type || "") as TargetingType,
    exclusions: adSet.exclusions || "",
    notes: adSet.targeting_details || adSet.notes || "",
    budget_enabled:
      adSet.budget_amount !== null && adSet.budget_amount !== undefined,
    budget_amount:
      adSet.budget_amount === null || adSet.budget_amount === undefined
        ? ""
        : String(adSet.budget_amount),
    budget_type: (adSet.budget_type || "") as WizardAdSet["budget_type"],
  }));

  const nestedAds: WizardAd[] = [];
  brief.ad_sets.forEach((adSet, adSetIndex) => {
    const adSetId = adSets[adSetIndex]?.id;
    (adSet.ads || []).forEach((ad) => {
      nestedAds.push({
        id: uid("ad"),
        label: ad.label || ad.release_title || `Ad ${nestedAds.length + 1}`,
        asset_type: (ad.asset_type || "") as AssetType,
        asset_links: (ad.asset_links || []).join("\n"),
        post_url: ad.post_url || "",
        boost_code: ad.boost_code || "",
        destination_url: ad.destination_url || "",
        copy: ad.copy || "",
        notes: ad.notes || "",
        assignedAdSetIds: adSetId ? [adSetId] : [],
      });
    });
  });

  const flatAds: WizardAd[] =
    nestedAds.length > 0
      ? nestedAds
      : (brief.ads || []).map((ad, index) => ({
          id: uid("ad"),
          label: ad.label || ad.release_title || `Ad ${index + 1}`,
          asset_type: (ad.asset_type || "") as AssetType,
          asset_links: (ad.asset_links || []).join("\n"),
          post_url: ad.post_url || "",
          boost_code: ad.boost_code || "",
          destination_url: ad.destination_url || "",
          copy: ad.copy || "",
          notes: ad.notes || "",
          assignedAdSetIds: adSets.map((adSet) => adSet.id),
        }));

  return {
    setup,
    adSets,
    ads: flatAds.length
      ? flatAds
      : [
          newAd(
            "Ad 1",
            adSets.map((adSet) => adSet.id),
          ),
        ],
  };
}

function restoreAdSet(adSet: Partial<WizardAdSet>, index: number): WizardAdSet {
  const fallback = newAdSet(`Ad set ${index + 1}`);
  return {
    ...fallback,
    ...adSet,
    id: adSet.id || fallback.id,
    label: adSet.label || fallback.label,
    locations: adSet.locations || "",
    age_min: adSet.age_min || "",
    age_max: adSet.age_max || "",
    gender: adSet.gender || "all",
    placements: adSet.placements || "",
    targeting_type: adSet.targeting_type || "unknown",
    exclusions: adSet.exclusions || "",
    notes: adSet.notes || "",
    budget_amount: adSet.budget_amount || "",
    budget_type: adSet.budget_type || "",
  };
}

function restoreAd(ad: Partial<WizardAd>, index: number, adSetIds: string[]): WizardAd {
  const fallback = newAd(`Ad ${index + 1}`, adSetIds);
  return {
    ...fallback,
    ...ad,
    id: ad.id || fallback.id,
    label: ad.label || fallback.label,
    asset_type: ad.asset_type || "video",
    asset_links: ad.asset_links || "",
    post_url: ad.post_url || "",
    boost_code: ad.boost_code || "",
    destination_url: ad.destination_url || "",
    copy: ad.copy || "",
    notes: ad.notes || "",
    assignedAdSetIds: ad.assignedAdSetIds || adSetIds,
  };
}

function safeSlide(value: unknown): number {
  return typeof value === "number"
    ? Math.max(0, Math.min(SLIDES.length - 1, value))
    : 0;
}

function setupHasContent(setup?: Partial<CampaignSetup>): boolean {
  if (!setup) return false;
  return Object.entries(setup).some(([key, value]) => {
    if (key === "currency" && value === "GBP") return false;
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  });
}

function adSetHasContent(adSet: Partial<WizardAdSet>, index: number): boolean {
  const defaultLabel = `Ad set ${index + 1}`;
  return Object.entries(adSet).some(([key, value]) => {
    if (key === "id" || key === "assignedAdSetIds") return false;
    if (key === "label" && value === defaultLabel) return false;
    if (key === "gender" && value === "all") return false;
    if (key === "targeting_type" && value === "unknown") return false;
    if (key === "asset_type" && value === "video") return false;
    if (key === "budget_enabled" && value === false) return false;
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  });
}

function adHasContent(ad: Partial<WizardAd>, index: number): boolean {
  const defaultLabel = `Ad ${index + 1}`;
  return Object.entries(ad).some(([key, value]) => {
    if (key === "id" || key === "assignedAdSetIds") return false;
    if (key === "label" && value === defaultLabel) return false;
    if (key === "asset_type" && value === "video") return false;
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  });
}

function normaliseAutosaveSnapshot(value: unknown): AutosaveSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as AutosaveSnapshot;
  return {
    setup: snapshot.setup,
    adSets: Array.isArray(snapshot.adSets) ? snapshot.adSets : undefined,
    ads: Array.isArray(snapshot.ads) ? snapshot.ads : undefined,
    slide: safeSlide(snapshot.slide),
    buildMode: snapshot.buildMode === "manual" || snapshot.buildMode === "ai" ? snapshot.buildMode : "manual",
    campaignQueue: Array.isArray(snapshot.campaignQueue) ? snapshot.campaignQueue : undefined,
    activeQueueId: snapshot.activeQueueId || null,
    updatedAt: typeof snapshot.updatedAt === "string" ? snapshot.updatedAt : undefined,
  };
}

function autosaveDraftLabel(setup?: { artist?: string | null; release_title?: string | null }, fallback = "Unfinished brief"): string {
  const artist = setup?.artist?.trim();
  const release = setup?.release_title?.trim();
  if (artist && release) return `${artist} / ${release}`;
  if (artist) return artist;
  if (release) return release;
  return fallback;
}

function autosaveDraftMeta(slide = 0, updatedAt?: string): string {
  const step = `Step ${safeSlide(slide) + 1} of ${SLIDES.length}`;
  if (!updatedAt) return step;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return step;
  return `${step} · ${date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
}

function autosaveContinueOptions(snapshot: AutosaveSnapshot | null): AutosaveContinueOption[] {
  if (!snapshot) return [];

  const pendingQueue = (snapshot.campaignQueue || []).filter((item) => item.status === "pending");
  if (pendingQueue.length > 0) {
    return pendingQueue.map((item, index) => ({
      id: item.id,
      label: item.label || autosaveDraftLabel(item.brief?.campaign, `Campaign ${index + 1}`),
      meta: autosaveDraftMeta(item.slide, snapshot.updatedAt),
    }));
  }

  if (!autosaveIsMeaningful(snapshot)) return [];
  return [
    {
      id: "single-draft",
      label: autosaveDraftLabel(snapshot.setup),
      meta: autosaveDraftMeta(snapshot.slide, snapshot.updatedAt),
    },
  ];
}

function autosaveIsMeaningful(snapshot: AutosaveSnapshot): boolean {
  if ((snapshot.campaignQueue || []).some((item) => item.status === "pending")) return true;
  if (setupHasContent(snapshot.setup)) return true;
  if ((snapshot.adSets || []).some(adSetHasContent)) return true;
  if ((snapshot.ads || []).some(adHasContent)) return true;
  return safeSlide(snapshot.slide) > 0 || snapshot.buildMode === "ai";
}

function toggleAssignedAdSet(ad: WizardAd, adSetId: string): string[] {
  return ad.assignedAdSetIds.includes(adSetId)
    ? ad.assignedAdSetIds.filter((id) => id !== adSetId)
    : [...ad.assignedAdSetIds, adSetId];
}

function FunnelPreview({
  setup,
  adSets,
  ads,
}: {
  setup: CampaignSetup;
  adSets: WizardAdSet[];
  ads: WizardAd[];
}) {
  const previewBrief = useMemo(
    () => buildBrief(setup, adSets, ads) as JDWCampaignBrief,
    [setup, adSets, ads],
  );
  return <BriefFunnelView brief={previewBrief} />;
}

function BottomFunnelDrawer({
  setup,
  adSets,
  ads,
}: {
  setup: CampaignSetup;
  adSets: WizardAdSet[];
  ads: WizardAd[];
}) {
  const terms = adSetUnit(setup.platform);

  return (
    <details className="bottom-funnel-drawer">
      <summary>
        <span className="bottom-funnel-copy">
          <span className="pixel-label">Preview</span>
          <strong>Expand live funnel</strong>
          <small>Campaign → {terms.lowerPlural} → ads → destination.</small>
        </span>
        <span className="bottom-funnel-meta">
          {adSets.length} {adSets.length === 1 ? terms.lower : terms.lowerPlural} · {ads.length} ad{ads.length === 1 ? "" : "s"}
        </span>
      </summary>
      <div className="bottom-funnel-drawer-body">
        <FunnelPreview setup={setup} adSets={adSets} ads={ads} />
      </div>
    </details>
  );
}

function SummaryStrip({
  setup,
  adSets,
  ads,
}: {
  setup: CampaignSetup;
  adSets: WizardAdSet[];
  ads: WizardAd[];
}) {
  const terms = adSetUnit(setup.platform);
  return (
    <div className="quick-summary">
      <span>{setup.artist || "artist?"}</span>
      <span>{setup.release_title || "project?"}</span>
      <span>{setup.platform || "platform?"}</span>
      <span>
        {adSets.length} {adSets.length === 1 ? terms.lower : terms.lowerPlural}
      </span>
      <span>
        {ads.length} ad{ads.length === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function questionForMissingField(field: string): string {
  if (field.includes("campaign.artist")) return "Who is the artist?";
  if (field.includes("campaign.acid")) return "What is the ACID?";
  if (field.includes("campaign.platform")) return "Which platform is this for?";
  if (field.includes("campaign.account")) return "Which ad account should this be built in?";
  if (field.includes("campaign.objective")) return "What objective are we buying against?";
  if (field.includes("campaign.campaign_type")) return "What campaign type should this use?";
  if (field.includes("campaign.conversion_location")) return "Where should conversions happen?";
  if (field.includes("campaign.optimisation_event")) return "What optimisation event should be used?";
  if (field.includes("campaign.pixel")) return "Which pixel should be attached?";
  if (field.includes("budget.amount")) return "What is the budget amount?";
  if (field.includes("budget.currency")) return "What currency is the budget in?";
  if (field.includes("ad_sets")) return "What audience or ad set details are missing?";
  if (field.includes("asset_type")) return "What type of creative asset is this?";
  if (field.includes("asset_links")) return "Where are the asset links, post URL, or boost code?";
  if (field.includes("copy")) return "What ad copy should be used?";
  if (field.includes("destination_url")) return "What destination URL should the ad send people to?";
  return `Can James confirm ${field}?`;
}

function slideForMissingField(field: string): number {
  if (field.includes("artist")) return 0;
  if (field.includes("release_title")) return 1;
  if (field.includes("platform")) return 2;
  if (field.includes("account") || field.includes("acid") || field.includes("asid")) return 3;
  if (field.includes("objective") || field.includes("campaign_type")) return 4;
  if (field.includes("conversion_location") || field.includes("optimisation_event") || field.includes("pixel")) return 5;
  if (field.includes("budget") || field.includes("start_date") || field.includes("end_date")) return 6;
  if (field.includes("ad_sets")) return 9;
  if (field.includes("ads")) return 10;
  return 11;
}

function completionScore(missingFields: string[]): number {
  if (missingFields.length === 0) return 100;
  return Math.max(32, 100 - missingFields.length * 9);
}

function missingFieldsForSlide(missingFields: string[], slide: number): string[] {
  return missingFields.filter((field) => slideForMissingField(field) === slide);
}

function queueStatusLabel(status: CampaignQueueItem["status"], isActive: boolean): string {
  if (status === "saved") return "saved";
  if (status === "skipped") return "skipped";
  return isActive ? "editing" : "pending";
}

function buildBatchJson(briefs: JDWCampaignBrief[]): string {
  return JSON.stringify(
    {
      brief_version: "JDW_CAMPAIGN_BRIEF_BATCH_V1",
      briefs,
    },
    null,
    2,
  );
}

function isCompleteQueueBrief(brief: JDWCampaignBrief): boolean {
  const validation = validateBriefJson(JSON.stringify(brief));
  return validation.ok && validation.briefs[0]?.missingFields.length === 0;
}

function sourceEvidenceRows(setup: CampaignSetup, adSets: WizardAdSet[], ads: WizardAd[]) {
  return [
    ["Artist", setup.artist],
    ["Project", setup.release_title],
    ["Platform", setup.platform],
    ["Account", setup.account],
    ["ACID", setup.acid],
    ["Budget", setup.budget_amount ? `${setup.currency || ""} ${setup.budget_amount}`.trim() : ""],
    ["Dates", [setup.start_date, setup.end_date].filter(Boolean).join(" to ")],
    ["Audiences", adSets.length ? String(adSets.length) : ""],
    ["Ads", ads.length ? String(ads.length) : ""],
  ].filter(([, value]) => value);
}

function MissingInfoCoach({
  missingFields,
  onEditField,
}: {
  missingFields: string[];
  onEditField: (field: string) => void;
}) {
  const uniqueQuestions = Array.from(new Set(missingFields));
  const visibleQuestions = uniqueQuestions.slice(0, 4);
  const extraQuestions = uniqueQuestions.slice(4);

  return (
    <section className={`missing-coach ${uniqueQuestions.length === 0 ? "missing-coach-ready" : ""}`}>
      <div>
        <p className="pixel-label">Ask James</p>
        <h4>{uniqueQuestions.length === 0 ? "Core brief looks complete." : "Things to confirm before build."}</h4>
      </div>
      {uniqueQuestions.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {visibleQuestions.map((field) => (
            <button
              key={field}
              type="button"
              className="missing-question"
              onClick={() => onEditField(field)}
            >
              <span>{questionForMissingField(field)}</span>
              <code>{field}</code>
            </button>
          ))}
          {extraQuestions.length ? (
            <details className="missing-extra-drawer">
              <summary>Show {extraQuestions.length} more checks</summary>
              <div className="mt-2 grid gap-2">
                {extraQuestions.map((field) => (
                  <button
                    key={field}
                    type="button"
                    className="missing-question"
                    onClick={() => onEditField(field)}
                  >
                    <span>{questionForMissingField(field)}</span>
                    <code>{field}</code>
                  </button>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold pixel-muted">
          Review the AI output, make any taste calls, then save the draft.
        </p>
      )}
    </section>
  );
}

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function ActiveInfoPanel({
  slide,
  setup,
  adSets,
  ads,
  onClose,
}: {
  slide: number;
  setup: CampaignSetup;
  adSets: WizardAdSet[];
  ads: WizardAd[];
  onClose: () => void;
}) {
  const selectedAdSet =
    adSets[Math.max(0, Math.min(adSets.length - 1, slide - 9))];
  const selectedAd = ads[0];
  const terms = adSetUnit(setup.platform);
  const rows =
    slide <= 7
      ? [
          ["Artist", setup.artist],
          ["Project", setup.release_title],
          ["Platform", setup.platform],
          ["Account", setup.account],
          ["ACID", setup.acid],
          ["Objective", setup.objective],
          [
            "Budget",
            setup.budget_amount
              ? `${setup.currency || ""} ${setup.budget_amount}`.trim()
              : "",
          ],
          [
            "Dates",
            [setup.start_date, setup.end_date].filter(Boolean).join(" → "),
          ],
        ]
      : slide === 8 || slide === 9
        ? [
            [terms.plural, adSets.length],
            ["Current", selectedAdSet?.label],
            ["Notes", selectedAdSet?.notes],
            [
              "Budget",
              selectedAdSet?.budget_enabled
                ? `${selectedAdSet.budget_amount || "?"} ${selectedAdSet.budget_type || ""}`.trim()
                : "—",
            ],
          ]
        : slide === 10
          ? [
              ["Ads", ads.length],
              ["First ad", selectedAd?.label],
              ["Asset type", selectedAd?.asset_type],
              ["Assigned", selectedAd ? selectedAd.assignedAdSetIds.length : 0],
            ]
          : [
              ["Artist", setup.artist],
              ["Project", setup.release_title],
              ["Platform", setup.platform],
              [terms.plural, adSets.length],
              ["Ads", ads.length],
            ];

  return (
    <aside className="active-info-panel pixel-window p-4 animate-pop">
      <div className="mb-4 flex items-center justify-between gap-3 border-b-3 border-black pb-3">
        <div>
          <p className="pixel-label">Selected info</p>
          <h3 className="mt-1 text-xl font-black">{SLIDES[slide].label}</h3>
        </div>
        <button type="button" className="mini-button" onClick={onClose}>
          Hide
        </button>
      </div>
      <div className="grid gap-2">
        {rows.map(([label, value]) => (
          <div key={String(label)} className="info-row">
            <span>{label}</span>
            <strong>
              {valueOrDash(value as string | number | null | undefined)}
            </strong>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t-3 border-black pt-3 text-xs font-black uppercase tracking-[0.08em]">
        Click the info button again to hide this panel. It stays out of the way
        until you need it.
      </p>
    </aside>
  );
}

function PlaybookGuideCard({ guide }: { guide: PlaybookGuide }) {
  return (
    <aside className="playbook-guide">
      <div>
        <p className="pixel-label">{guide.eyebrow}</p>
        <h4>{guide.title}</h4>
        <p>{guide.body}</p>
      </div>
      <ul>
        {guide.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </aside>
  );
}

function AdvancedGuidanceDrawer({ guide }: { guide: PlaybookGuide }) {
  return (
    <details className="advanced-guidance-drawer">
      <summary>
        <span>
          <span className="pixel-label">Advanced guidance</span>
          <strong>Campaign strategy</strong>
        </span>
        <span className="drawer-meta">{guide.eyebrow}</span>
      </summary>
      <PlaybookGuideCard guide={guide} />
    </details>
  );
}

function WizardControls({
  slide,
  onBack,
  onSkip,
  onNext,
  onSubmit,
  isPending,
  briefId,
  importedJson,
  queueTotal = 0,
  hasNextQueuedCampaign = false,
}: {
  slide: number;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isPending: boolean;
  briefId?: string;
  importedJson: string | null;
  queueTotal?: number;
  hasNextQueuedCampaign?: boolean;
}) {
  const saveLabel = isPending
    ? "Saving..."
    : queueTotal > 1 && hasNextQueuedCampaign
      ? "Save & next campaign"
      : queueTotal > 1
        ? "Save final campaign"
        : briefId
          ? "Update brief"
          : importedJson
            ? "Submit imported JSON"
            : "Save draft";

  return (
    <div className="wizard-controls wizard-controls-inline">
      <button
        type="button"
        onClick={onBack}
        disabled={slide === 0}
        className="mini-button px-4 py-3 disabled:opacity-40"
      >
        Back
      </button>
      <button
        type="button"
        onClick={onSkip}
        disabled={slide === SLIDES.length - 1}
        className="mini-button px-4 py-3 disabled:opacity-40"
      >
        Skip
      </button>
      {slide < SLIDES.length - 1 ? (
        <button
          type="button"
          onClick={onNext}
          className="pixel-button px-6 py-4 text-sm"
        >
          Next
        </button>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={isPending}
          className="pixel-button px-6 py-4 text-sm disabled:opacity-60"
        >
          {saveLabel}
        </button>
      )}
    </div>
  );
}

function BuilderModeBanner({
  mode,
  onBackToStart,
}: {
  mode: BuildMode;
  onBackToStart: () => void;
}) {
  if (mode === "choice") return null;
  return (
    <section className="builder-mode-banner">
      <div>
        <p className="pixel-label">{mode === "ai" ? "AI imported draft" : "Manual build"}</p>
        <h1>{mode === "ai" ? "Review every setting like a manual build." : "Manual campaign walkthrough."}</h1>
        <p>
          {mode === "ai"
            ? "Groq has only pre-filled the draft. Use Back/Next to check every campaign, tracking, audience, ad, and review setting before saving."
            : "Start empty and move through the same Meta/TikTok setup order used by Ads Manager."}
        </p>
      </div>
      <button type="button" className="mini-button" onClick={onBackToStart}>
        Change path
      </button>
    </section>
  );
}

function CampaignQueueBar({
  queue,
  activeId,
  onSelect,
}: {
  queue: CampaignQueueItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (queue.length <= 1) return null;

  const activeIndex = queue.findIndex((item) => item.id === activeId);
  const savedCount = queue.filter((item) => item.status === "saved").length;
  const skippedCount = queue.filter((item) => item.status === "skipped").length;

  return (
    <section className="campaign-queue-bar">
      <div className="campaign-queue-heading">
        <div>
          <p className="pixel-label">AI campaign queue</p>
          <h2>Campaign {Math.max(0, activeIndex) + 1} of {queue.length}</h2>
        </div>
        <span className="campaign-queue-count">{savedCount}/{queue.length} saved</span>
      </div>
      {skippedCount > 0 ? (
        <p className="campaign-queue-note">{skippedCount} skipped campaign{skippedCount === 1 ? "" : "s"} kept out of the save run.</p>
      ) : null}
      <div className="campaign-queue-list" role="tablist" aria-label="AI imported campaigns">
        {queue.map((item, index) => {
          const isActive = item.id === activeId;
          const isSaved = item.status === "saved";
          const isSkipped = item.status === "skipped";
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              disabled={isSaved || isSkipped}
              className={`campaign-queue-chip ${isActive ? "campaign-queue-chip-active" : ""} ${isSaved ? "campaign-queue-chip-saved" : ""} ${isSkipped ? "campaign-queue-chip-skipped" : ""}`}
            >
              <span className="campaign-queue-number">{index + 1}</span>
              <span className="campaign-queue-name">{item.label}</span>
              <span className="campaign-queue-status">{queueStatusLabel(item.status, isActive)}</span>
            </button>
          );
        })}
      </div>
      <p className="campaign-queue-note">
        Switch between pending campaigns anytime. Your current edits are kept in the queue. Saving moves to the next pending campaign.
      </p>
    </section>
  );
}

function BuilderStepRail({
  slide,
  setup,
  missingFields,
  onSelect,
}: {
  slide: number;
  setup: CampaignSetup;
  missingFields: string[];
  onSelect: (slide: number) => void;
}) {
  return (
    <section className="builder-step-rail pixel-window">
      <div className="builder-rail-heading">
        <p className="pixel-label">Build path</p>
        <strong>{slide + 1}/{SLIDES.length}</strong>
      </div>
      <div className="builder-step-list">
        {SLIDES.map((item, index) => {
          const missingCount = missingFieldsForSlide(missingFields, index).length;
          const isActive = index === slide;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelect(index)}
              className={`builder-step-item ${isActive ? "builder-step-item-active" : ""} ${missingCount ? "builder-step-item-missing" : ""}`}
            >
              <span className="builder-step-index">{String(index + 1).padStart(2, "0")}</span>
              <span>
                <strong>{slideLabelForPlatform(index, setup.platform)}</strong>
                <small>{missingCount ? `${missingCount} missing` : index < slide ? "checked" : item.hint}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BuildLevelNav({
  slide,
  setup,
  missingFields,
  onSelect,
}: {
  slide: number;
  setup: CampaignSetup;
  missingFields: string[];
  onSelect: (slide: number) => void;
}) {
  const activeLevel = buildLevelForSlide(slide);

  return (
    <nav className="build-level-nav" aria-label="Campaign builder sections">
      {BUILD_LEVELS.map((level) => {
        const missingCount = missingFields.filter(
          (field) => buildLevelForSlide(slideForMissingField(field)) === level.key,
        ).length;
        const isActive = level.key === activeLevel;
        return (
          <button
            key={level.key}
            type="button"
            onClick={() => onSelect(level.slide)}
            aria-current={isActive ? "step" : undefined}
            className={`build-level-tab ${isActive ? "build-level-tab-active" : ""} ${missingCount ? "build-level-tab-missing" : ""}`}
          >
            <span className="build-level-step">{level.stepRange}</span>
            <span>
              <strong>{buildLevelLabel(level.key, setup.platform)}</strong>
              <small>{missingCount ? `${missingCount} missing` : level.hint}</small>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function QueueActionPanel({
  hasQueue,
  readyCount,
  pendingCount,
  canDuplicatePrevious,
  isPending,
  onSaveAllComplete,
  onSkip,
  onDuplicatePrevious,
}: {
  hasQueue: boolean;
  readyCount: number;
  pendingCount: number;
  canDuplicatePrevious: boolean;
  isPending: boolean;
  onSaveAllComplete: () => void;
  onSkip: () => void;
  onDuplicatePrevious: () => void;
}) {
  if (!hasQueue) return null;

  return (
    <section className="queue-action-panel pixel-window">
      <p className="pixel-label">Batch tools</p>
      <h3>{pendingCount} pending</h3>
      <div className="grid gap-2">
        <button
          type="button"
          className="pixel-button text-xs disabled:opacity-50"
          onClick={onSaveAllComplete}
          disabled={isPending || readyCount === 0}
        >
          Save all complete ({readyCount})
        </button>
        <button type="button" className="mini-button" onClick={onDuplicatePrevious} disabled={!canDuplicatePrevious}>
          Duplicate previous
        </button>
        <button type="button" className="mini-button danger" onClick={onSkip}>
          Skip campaign
        </button>
      </div>
    </section>
  );
}

function BuilderRailDrawer({
  eyebrow,
  title,
  meta,
  children,
  defaultOpen = false,
  className = "",
}: {
  eyebrow: string;
  title: string;
  meta?: string | number;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details
      className={`builder-side-card builder-rail-drawer ${className}`}
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary>
        <span>
          <span className="pixel-label">{eyebrow}</span>
          <strong>{title}</strong>
        </span>
        {meta !== undefined ? <span className="drawer-meta">{meta}</span> : null}
      </summary>
      <div className="builder-rail-drawer-body">{children}</div>
    </details>
  );
}

function CampaignTemplatePanel({
  setup,
  onApplyTemplate,
}: {
  setup: CampaignSetup;
  onApplyTemplate: (template: CampaignTemplateId) => void;
}) {
  const activePlatform = setup.platform || "Meta";

  return (
    <div className="template-panel">
      <div className="builder-side-card-heading">
        <p className="pixel-label">Smart templates</p>
        <span>{activePlatform}</span>
      </div>
      <div className="template-button-grid">
        <button type="button" onClick={() => onApplyTemplate("meta_streaming")}>
          <strong>Meta streaming</strong>
          <span>Website conversions</span>
        </button>
        <button type="button" onClick={() => onApplyTemplate("meta_views")}>
          <strong>Meta views</strong>
          <span>ThruPlay setup</span>
        </button>
        <button type="button" onClick={() => onApplyTemplate("tiktok_spark")}>
          <strong>TikTok Spark</strong>
          <span>Boost code ready</span>
        </button>
      </div>
    </div>
  );
}

function SourceEvidencePanel({
  setup,
  adSets,
  ads,
}: {
  setup: CampaignSetup;
  adSets: WizardAdSet[];
  ads: WizardAd[];
}) {
  const rows = sourceEvidenceRows(setup, adSets, ads);

  return (
    <div className="source-evidence-panel">
      <div className="builder-side-card-heading">
        <p className="pixel-label">Captured evidence</p>
        <span>{rows.length}</span>
      </div>
      {rows.length ? (
        <div className="evidence-list">
          {rows.map(([label, value]) => (
            <p key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </p>
          ))}
        </div>
      ) : (
        <p className="builder-empty-note">The right signals will appear as the brief fills in.</p>
      )}
    </div>
  );
}

function BuilderInsightPanel({
  setup,
  adSets,
  ads,
  missingFields,
  onEditMissing,
  onApplyTemplate,
}: {
  setup: CampaignSetup;
  adSets: WizardAdSet[];
  ads: WizardAd[];
  missingFields: string[];
  onEditMissing: (field: string) => void;
  onApplyTemplate: (template: CampaignTemplateId) => void;
}) {
  const score = completionScore(missingFields);
  const evidenceCount = sourceEvidenceRows(setup, adSets, ads).length;

  return (
    <aside className="builder-right-rail">
      <section className="builder-side-card confidence-card">
        <div className="builder-side-card-heading">
          <p className="pixel-label">Build confidence</p>
          <span>{score}%</span>
        </div>
        <div className="confidence-track">
          <span style={{ width: `${score}%` }} />
        </div>
        <p>{missingFields.length ? `${missingFields.length} items still need a decision.` : "Ready to save."}</p>
      </section>

      <BuilderRailDrawer eyebrow="Advanced tools" title="Smart templates" meta={setup.platform || "Tools"}>
        <CampaignTemplatePanel setup={setup} onApplyTemplate={onApplyTemplate} />
      </BuilderRailDrawer>

      <BuilderRailDrawer eyebrow="Source notes" title="Captured evidence" meta={evidenceCount}>
        <SourceEvidencePanel setup={setup} adSets={adSets} ads={ads} />
      </BuilderRailDrawer>

    </aside>
  );
}

function EntryChoiceScreen({
  autosaveOptions,
  onManual,
  onContinueDraft,
  onGenerated,
}: {
  autosaveOptions: AutosaveContinueOption[];
  onManual: () => void;
  onContinueDraft: (id: string) => void;
  onGenerated: (
    json: string,
    validation: Extract<BriefValidationResult, { ok: true }>,
    message: string,
  ) => void;
}) {
  return (
    <div className="entry-choice-screen">
      <section className="entry-heading">
        <p className="pixel-label">JDW build studio</p>
        <h1>Choose how to start.</h1>
        <p>
          Fresh briefs now start completely blank. Autosave only appears as a Continue option when there is an unfinished draft.
        </p>
      </section>

      <section className="entry-grid">
        {autosaveOptions.length ? (
          <article className="entry-card entry-card-continue">
            <p className="pixel-label">Autosave</p>
            <h2>Continue unfinished.</h2>
            <p>
              Pick this only if you actually want to carry on from a draft that was not saved yet. Saved briefs are removed from this list automatically.
            </p>
            <div className="autosave-option-list">
              {autosaveOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="autosave-option-card"
                  onClick={() => onContinueDraft(option.id)}
                >
                  <span>{option.label}</span>
                  <small>{option.meta}</small>
                </button>
              ))}
            </div>
          </article>
        ) : null}

        <article className="entry-card entry-card-manual">
          <p className="pixel-label">Fresh brief</p>
          <h2>Create from scratch.</h2>
          <p>
            Clears any old local autosave and starts with empty fields. Use this when you are making a completely new brief.
          </p>
          <button type="button" className="pixel-button mt-5" onClick={onManual}>
            Create fresh brief
          </button>
        </article>

        <article className="entry-card entry-card-ai">
          <p className="pixel-label">AI import</p>
          <h2>Paste James notes first.</h2>
          <p>
            Groq pre-fills a draft only. After import, you still go through the exact same walkthrough and confirm every setting before saving.
          </p>
          <div className="mt-5">
            <AiBriefPanel onGenerated={onGenerated} />
          </div>
        </article>
      </section>
    </div>
  );
}

export function NewBriefForm({
  initialBrief,
  briefId,
  savedArtists = [],
  savedProjects = [],
}: NewBriefFormProps) {
  const router = useRouter();
  const initialState = useMemo(
    () => briefToBuilderState(initialBrief),
    [initialBrief],
  );
  const [slide, setSlide] = useState(0);
  const [buildMode, setBuildMode] = useState<BuildMode>(briefId || initialBrief ? "manual" : "choice");
  const [setup, setSetup] = useState<CampaignSetup>(initialState.setup);
  const [adSets, setAdSets] = useState<WizardAdSet[]>(initialState.adSets);
  const [ads, setAds] = useState<WizardAd[]>(initialState.ads);
  const [sameAdSetNotes, setSameAdSetNotes] = useState("");
  const [sameBudgetEnabled, setSameBudgetEnabled] = useState(false);
  const [sameBudgetAmount, setSameBudgetAmount] = useState("");
  const [sameBudgetType, setSameBudgetType] =
    useState<WizardAdSet["budget_type"]>("");
  const [importedJson, setImportedJson] = useState<string | null>(null);
  const [importedValidation, setImportedValidation] =
    useState<BriefValidationResult | null>(null);
  const [campaignQueue, setCampaignQueue] = useState<CampaignQueueItem[]>([]);
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAutosaveLoaded, setIsAutosaveLoaded] = useState(Boolean(briefId || initialBrief));
  const [autosaveMessage, setAutosaveMessage] = useState<string | null>(null);
  const [autosaveSnapshot, setAutosaveSnapshot] = useState<AutosaveSnapshot | null>(null);
  const autosaveSuppressedRef = useRef(false);
  const [isPending, startTransition] = useTransition();

  const adSetIds = useMemo(() => adSets.map((adSet) => adSet.id), [adSets]);
  const manualJson = useMemo(
    () => JSON.stringify(buildBrief(setup, adSets, ads), null, 2),
    [setup, adSets, ads],
  );
  const manualValidation = useMemo(
    () => validateBriefJson(manualJson),
    [manualJson],
  );
  const activeValidation = importedValidation?.ok
    ? importedValidation
    : manualValidation;
  const missingFields = activeValidation.ok
    ? activeValidation.briefs.reduce(
        (fields, brief) => [...fields, ...brief.missingFields],
        [] as string[],
      )
    : [];
  const activeJson =
    importedValidation?.ok && importedJson ? importedJson : manualJson;
  const currentSlide = SLIDES[slide];
  const currentSlideLabel = slideLabelForPlatform(slide, setup.platform);
  const currentSlideHint = slideHintForPlatform(slide, setup.platform);
  const currentPlaybookGuide = playbookGuide(slide, setup.platform);
  const adSetTerms = adSetUnit(setup.platform);
  const activeQueueIndex = campaignQueue.findIndex((item) => item.id === activeQueueId);
  const queueTotal = campaignQueue.length;
  const hasCampaignQueue = queueTotal > 1 && activeQueueIndex >= 0;
  const hasNextQueuedCampaign = hasCampaignQueue
    ? campaignQueue.some((item) => item.id !== activeQueueId && item.status === "pending")
    : false;
  const queueDraftSnapshot = useMemo(() => {
    if (!activeQueueId) return campaignQueue;
    const draftBrief = buildBrief(setup, adSets, ads) as JDWCampaignBrief;
    return campaignQueue.map((item, index) =>
      item.id === activeQueueId && item.status === "pending"
        ? {
            ...item,
            brief: draftBrief,
            label: queueLabelForBrief(draftBrief, index),
            slide,
          }
        : item,
    );
  }, [campaignQueue, activeQueueId, setup, adSets, ads, slide]);
  const queueReadyCount = hasCampaignQueue
    ? queueDraftSnapshot.filter((item) => item.status === "pending" && isCompleteQueueBrief(item.brief)).length
    : 0;
  const queuePendingCount = hasCampaignQueue
    ? queueDraftSnapshot.filter((item) => item.status === "pending").length
    : 0;
  const canDuplicatePreviousCampaign = hasCampaignQueue && activeQueueIndex > 0;
  const continueOptions = useMemo(
    () => autosaveContinueOptions(autosaveSnapshot),
    [autosaveSnapshot],
  );

  useEffect(() => {
    if (briefId || initialBrief) {
      setIsAutosaveLoaded(true);
      return;
    }

    try {
      const saved = window.localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const parsed = normaliseAutosaveSnapshot(JSON.parse(saved));
        if (parsed && autosaveContinueOptions(parsed).length > 0) {
          setAutosaveSnapshot(parsed);
        } else {
          window.localStorage.removeItem(AUTOSAVE_KEY);
        }
      }
    } catch {
      window.localStorage.removeItem(AUTOSAVE_KEY);
      setAutosaveSnapshot(null);
    } finally {
      setIsAutosaveLoaded(true);
    }
  }, [briefId, initialBrief]);

  useEffect(() => {
    if (!isAutosaveLoaded || briefId || initialBrief || buildMode === "choice" || autosaveSuppressedRef.current) return;
    const timeout = window.setTimeout(() => {
      const nextSnapshot: AutosaveSnapshot = {
        setup,
        adSets,
        ads,
        slide,
        buildMode,
        campaignQueue,
        activeQueueId,
        updatedAt: new Date().toISOString(),
      };

      if (!autosaveIsMeaningful(nextSnapshot)) {
        window.localStorage.removeItem(AUTOSAVE_KEY);
        setAutosaveSnapshot(null);
        return;
      }

      window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(nextSnapshot));
      setAutosaveSnapshot(nextSnapshot);
      setAutosaveMessage("Autosaved");
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [setup, adSets, ads, slide, buildMode, campaignQueue, activeQueueId, isAutosaveLoaded, briefId, initialBrief]);

  function clearAutosave() {
    window.localStorage.removeItem(AUTOSAVE_KEY);
    setAutosaveSnapshot(null);
    setAutosaveMessage("Autosave cleared");
  }

  function resetBuilderToBlank() {
    const blank = briefToBuilderState();
    setSetup(blank.setup);
    setAdSets(blank.adSets);
    setAds(blank.ads);
    setSameAdSetNotes("");
    setSameBudgetEnabled(false);
    setSameBudgetAmount("");
    setSameBudgetType("");
    setImportedJson(null);
    setImportedValidation(null);
    setCampaignQueue([]);
    setActiveQueueId(null);
    setSubmitError(null);
    setSlide(0);
  }

  function restoreSingleAutosaveDraft(snapshot: AutosaveSnapshot) {
    const restoredAdSets =
      Array.isArray(snapshot.adSets) && snapshot.adSets.length > 0
        ? snapshot.adSets.map(restoreAdSet)
        : briefToBuilderState().adSets;
    const restoredAdSetIds = restoredAdSets.map((adSet) => adSet.id);
    const restoredAds =
      Array.isArray(snapshot.ads) && snapshot.ads.length > 0
        ? snapshot.ads.map((ad, index) => restoreAd(ad, index, restoredAdSetIds))
        : [newAd("Ad 1", restoredAdSetIds)];

    setSetup({ ...EMPTY_SETUP, ...(snapshot.setup || {}) });
    setAdSets(restoredAdSets);
    setAds(restoredAds);
    setCampaignQueue([]);
    setActiveQueueId(null);
    setImportedJson(null);
    setImportedValidation(null);
    setSubmitError(null);
    setSlide(safeSlide(snapshot.slide));
    setBuildMode(snapshot.buildMode === "ai" ? "ai" : "manual");
    setAutosaveMessage("Unfinished draft restored");
    scrollBuilderToTop();
  }

  function continueAutosaveDraft(id: string) {
    if (!autosaveSnapshot) return;

    const queue: CampaignQueueItem[] = (autosaveSnapshot.campaignQueue || []).map((item) => ({
      ...item,
      status: (item.status === "saved" || item.status === "skipped" ? item.status : "pending") as CampaignQueueItem["status"],
      slide: safeSlide(item.slide),
    }));
    const pendingQueue = queue.filter((item) => item.status === "pending");

    if (pendingQueue.length > 0) {
      const target = pendingQueue.find((item) => item.id === id) || pendingQueue[0];
      setCampaignQueue(queue);
      setActiveQueueId(target.id);
      loadBriefIntoBuilder(target.brief);
      setSlide(target.slide || 0);
      setBuildMode("ai");
      setAutosaveMessage(`Restored ${target.label}`);
      scrollBuilderToTop();
      return;
    }

    restoreSingleAutosaveDraft(autosaveSnapshot);
  }

  function clearImport() {
    setImportedJson(null);
    setImportedValidation(null);
  }

  function scrollBuilderToTop() {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function currentBuilderBrief(): JDWCampaignBrief {
    return buildBrief(setup, adSets, ads) as JDWCampaignBrief;
  }

  function loadBriefIntoBuilder(brief: JDWCampaignBrief) {
    const nextState = briefToBuilderState(brief);
    setSetup(nextState.setup);
    setAdSets(nextState.adSets);
    setAds(nextState.ads);
    setImportedJson(null);
    setImportedValidation(null);
    setSubmitError(null);
  }

  function persistActiveQueueDraft(customSlide = slide) {
    if (!activeQueueId) return;
    const draftBrief = currentBuilderBrief();
    setCampaignQueue((current) =>
      current.map((item, index) =>
        item.id === activeQueueId && item.status !== "saved"
          ? {
              ...item,
              brief: draftBrief,
              label: queueLabelForBrief(draftBrief, index),
              slide: customSlide,
            }
          : item,
      ),
    );
  }

  function selectQueuedCampaign(id: string) {
    if (id === activeQueueId) return;
    const target = campaignQueue.find((item) => item.id === id);
    if (!target || target.status !== "pending") return;
    persistActiveQueueDraft();
    setActiveQueueId(id);
    loadBriefIntoBuilder(target.brief);
    setSlide(target.slide || 0);
    setBuildMode("ai");
    setAutosaveMessage(`Loaded ${target.label}`);
  }

  function applyValidatedJson(
    json: string,
    validation: BriefValidationResult,
    message: string,
  ) {
    if (!validation.ok) {
      setSubmitError(validation.message);
      return;
    }

    setSubmitError(null);
    const generatedBriefs = validation.briefs.map((item) => item.brief);

    if (generatedBriefs.length === 1) {
      setCampaignQueue([]);
      setActiveQueueId(null);
      loadBriefIntoBuilder(generatedBriefs[0]);
      setBuildMode("ai");
      setSlide(0);
      setAutosaveMessage(`${message}; review from step 1`);
      scrollBuilderToTop();
      return;
    }

    const nextQueue = makeCampaignQueue(generatedBriefs);
    setCampaignQueue(nextQueue);
    setActiveQueueId(nextQueue[0]?.id || null);
    loadBriefIntoBuilder(generatedBriefs[0]);
    setBuildMode("ai");
    setSlide(0);
    setAutosaveMessage(`${generatedBriefs.length} campaigns queued. Review 1 of ${generatedBriefs.length}.`);
    scrollBuilderToTop();
  }

  function updateSetup<K extends keyof CampaignSetup>(
    key: K,
    value: CampaignSetup[K],
  ) {
    clearImport();
    setSetup((current) => ({ ...current, [key]: value }));
  }

  function updateAdSet(id: string, changes: Partial<WizardAdSet>) {
    clearImport();
    setAdSets((current) =>
      current.map((adSet) =>
        adSet.id === id ? { ...adSet, ...changes } : adSet,
      ),
    );
  }

  function updateAd(id: string, changes: Partial<WizardAd>) {
    clearImport();
    setAds((current) =>
      current.map((ad) => (ad.id === id ? { ...ad, ...changes } : ad)),
    );
  }

  function changeAdSetCount(count: number) {
    clearImport();
    setAdSets((current) => {
      const next = fitAdSetCount(current, count);
      const nextIds = next.map((adSet) => adSet.id);
      setAds((currentAds) =>
        currentAds.map((ad) => ({
          ...ad,
          assignedAdSetIds: ad.assignedAdSetIds.length
            ? ad.assignedAdSetIds.filter((id) => nextIds.includes(id))
            : nextIds,
        })),
      );
      return next;
    });
  }

  function nextSlide() {
    setSlide((current) => {
      const next = Math.min(SLIDES.length - 1, current + 1);
      persistActiveQueueDraft(next);
      return next;
    });
  }

  function previousSlide() {
    setSlide((current) => {
      const next = Math.max(0, current - 1);
      persistActiveQueueDraft(next);
      return next;
    });
  }

  function submitBrief() {
    setSubmitError(null);
    const jsonToSubmit = manualJson;
    const validation = validateBriefJson(jsonToSubmit);
    if (!validation.ok) {
      setSubmitError(validation.message);
      return;
    }

    const queueBeforeSave = campaignQueue;
    const activeIdBeforeSave = activeQueueId;
    const activeIndexBeforeSave = activeQueueIndex;
    const currentDraftBrief = currentBuilderBrief();
    const nextQueuedItem =
      hasCampaignQueue && activeIdBeforeSave
        ? [
            ...queueBeforeSave.slice(Math.max(0, activeIndexBeforeSave + 1)),
            ...queueBeforeSave.slice(0, Math.max(0, activeIndexBeforeSave)),
          ].find((item) => item.id !== activeIdBeforeSave && item.status === "pending")
        : undefined;

    autosaveSuppressedRef.current = true;
    startTransition(async () => {
      const result = briefId
        ? await updateBriefAction(briefId, jsonToSubmit)
        : await submitBriefAction(jsonToSubmit);
      if (!result.ok) {
        autosaveSuppressedRef.current = false;
        setSubmitError(result.message);
        return;
      }

      if (hasCampaignQueue && activeIdBeforeSave && !briefId) {
        setCampaignQueue((current) =>
          current.map((item, index) =>
            item.id === activeIdBeforeSave
              ? {
                  ...item,
                  brief: currentDraftBrief,
                  label: queueLabelForBrief(currentDraftBrief, index),
                  status: "saved" as const,
                  savedId: result.id,
                  slide: SLIDES.length - 1,
                }
              : item,
          ),
        );

        if (nextQueuedItem) {
          autosaveSuppressedRef.current = false;
          setActiveQueueId(nextQueuedItem.id);
          loadBriefIntoBuilder(nextQueuedItem.brief);
          setSlide(nextQueuedItem.slide || 0);
          setBuildMode("ai");
          setAutosaveMessage(`Saved. Next: ${nextQueuedItem.label}`);
          return;
        }

        window.localStorage.removeItem(AUTOSAVE_KEY);
        setAutosaveSnapshot(null);
        router.push("/inbox");
        return;
      }

      if (!briefId) {
        window.localStorage.removeItem(AUTOSAVE_KEY);
        setAutosaveSnapshot(null);
      }
      router.push(result.ids.length === 1 ? `/brief/${result.id}` : "/inbox");
    });
  }

  function saveAllCompleteQueuedCampaigns() {
    if (!hasCampaignQueue || briefId) return;
    setSubmitError(null);

    const completeItems = queueDraftSnapshot.filter(
      (item) => item.status === "pending" && isCompleteQueueBrief(item.brief),
    );

    if (completeItems.length === 0) {
      setSubmitError("No queued campaigns are complete enough to batch save yet.");
      return;
    }

    autosaveSuppressedRef.current = true;
    startTransition(async () => {
      const result = await submitBriefAction(buildBatchJson(completeItems.map((item) => item.brief)));
      if (!result.ok) {
        autosaveSuppressedRef.current = false;
        setSubmitError(result.message);
        return;
      }

      const savedIds = new Map(completeItems.map((item, index) => [item.id, result.ids[index]]));
      const nextQueue = queueDraftSnapshot.map((item, index) =>
        savedIds.has(item.id)
          ? {
              ...item,
              label: queueLabelForBrief(item.brief, index),
              status: "saved" as const,
              savedId: savedIds.get(item.id),
              slide: SLIDES.length - 1,
            }
          : item,
      );
      const nextPending = nextQueue.find((item) => item.status === "pending");

      setCampaignQueue(nextQueue);

      if (nextPending) {
        autosaveSuppressedRef.current = false;
        setActiveQueueId(nextPending.id);
        loadBriefIntoBuilder(nextPending.brief);
        setSlide(nextPending.slide || 0);
        setBuildMode("ai");
        setAutosaveMessage(`Saved ${completeItems.length}. Next: ${nextPending.label}`);
        return;
      }

      window.localStorage.removeItem(AUTOSAVE_KEY);
      setAutosaveSnapshot(null);
      router.push("/inbox");
    });
  }

  function skipQueuedCampaign() {
    if (!hasCampaignQueue || !activeQueueId) return;
    const nextQueue = queueDraftSnapshot.map((item) =>
      item.id === activeQueueId && item.status === "pending"
        ? { ...item, status: "skipped" as const, slide }
        : item,
    );
    const nextPending = nextQueue.find((item) => item.status === "pending");
    setCampaignQueue(nextQueue);

    if (nextPending) {
      setActiveQueueId(nextPending.id);
      loadBriefIntoBuilder(nextPending.brief);
      setSlide(nextPending.slide || 0);
      setAutosaveMessage(`Skipped. Next: ${nextPending.label}`);
      return;
    }

    window.localStorage.removeItem(AUTOSAVE_KEY);
    setAutosaveSnapshot(null);
    router.push("/inbox");
  }

  function duplicatePreviousQueuedCampaign() {
    if (!hasCampaignQueue || !activeQueueId || activeQueueIndex <= 0) return;
    const previous = queueDraftSnapshot
      .slice(0, activeQueueIndex)
      .reverse()
      .find((item) => item.status !== "skipped");

    if (!previous) return;

    loadBriefIntoBuilder(previous.brief);
    setCampaignQueue((current) =>
      current.map((item, index) =>
        item.id === activeQueueId && item.status === "pending"
          ? {
              ...item,
              brief: previous.brief,
              label: queueLabelForBrief(previous.brief, index),
              slide: 0,
            }
          : item,
      ),
    );
    setSlide(0);
    setAutosaveMessage(`Duplicated settings from ${previous.label}`);
  }

  function applyCampaignTemplate(template: CampaignTemplateId) {
    clearImport();
    const templateSetup: Record<CampaignTemplateId, Partial<CampaignSetup>> = {
      meta_streaming: {
        platform: "Meta",
        objective: "Streaming Conversions",
        campaign_type: "Sales",
        conversion_location: "Website",
        optimisation_event: "ViewContent",
        budget_type: "campaign_total",
        currency: "GBP",
      },
      meta_views: {
        platform: "Meta",
        objective: "Video Views / ThruPlay",
        campaign_type: "Video Views",
        conversion_location: "None",
        optimisation_event: "ThruPlay",
        budget_type: "campaign_total",
        currency: "GBP",
      },
      tiktok_spark: {
        platform: "TikTok",
        objective: "Video Views / 15-sec engaged view",
        campaign_type: "Spark / Video Views",
        conversion_location: "None",
        optimisation_event: "15-sec engaged view",
        budget_type: "campaign_total",
        currency: "GBP",
      },
    };

    const templatePlacements: Record<CampaignTemplateId, string> = {
      meta_streaming: "Instagram Reels\nInstagram Stories\nFacebook Reels\nFeed",
      meta_views: "Instagram Reels\nInstagram Stories\nFacebook Reels",
      tiktok_spark: "TikTok feed\nSpark Ads",
    };

    setSetup((current) => ({
      ...current,
      ...templateSetup[template],
    }));
    setAdSets((current) =>
      current.map((adSet) => ({
        ...adSet,
        placements: adSet.placements || templatePlacements[template],
        targeting_type: adSet.targeting_type && adSet.targeting_type !== "unknown" ? adSet.targeting_type : "broad",
      })),
    );
    setAutosaveMessage("Template applied");
  }

  function startManualBuild() {
    autosaveSuppressedRef.current = false;
    window.localStorage.removeItem(AUTOSAVE_KEY);
    setAutosaveSnapshot(null);
    resetBuilderToBlank();
    setBuildMode("manual");
    setAutosaveMessage("Fresh brief started");
    scrollBuilderToTop();
  }

  function backToStartChoice() {
    persistActiveQueueDraft();
    const snapshot: AutosaveSnapshot = {
      setup,
      adSets,
      ads,
      slide,
      buildMode,
      campaignQueue: queueDraftSnapshot,
      activeQueueId,
      updatedAt: new Date().toISOString(),
    };
    if (autosaveIsMeaningful(snapshot)) setAutosaveSnapshot(snapshot);
    setBuildMode("choice");
    setSubmitError(null);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);

      if (isTyping) return;

      if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        nextSlide();
      }

      if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        previousSlide();
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        if (slide < SLIDES.length - 1) {
          nextSlide();
        } else if (!isPending) {
          submitBrief();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (buildMode === "choice" && !briefId && !initialBrief) {
    return (
      <EntryChoiceScreen
        autosaveOptions={continueOptions}
        onManual={startManualBuild}
        onContinueDraft={continueAutosaveDraft}
        onGenerated={(json, validation, message) =>
          applyValidatedJson(json, validation, message)
        }
      />
    );
  }

  return (
    <div className="one-by-one-builder builder-console">
      <BuilderModeBanner mode={buildMode} onBackToStart={backToStartChoice} />

      <div className="builder-console-grid">
        <aside className="builder-left-rail">
          <CampaignQueueBar
            queue={campaignQueue}
            activeId={activeQueueId}
            onSelect={selectQueuedCampaign}
          />
          <BuilderStepRail
            slide={slide}
            setup={setup}
            missingFields={missingFields}
            onSelect={(index) => {
              persistActiveQueueDraft(index);
              setSlide(index);
            }}
          />
          <QueueActionPanel
            hasQueue={hasCampaignQueue}
            readyCount={queueReadyCount}
            pendingCount={queuePendingCount}
            canDuplicatePrevious={canDuplicatePreviousCampaign}
            isPending={isPending}
            onSaveAllComplete={saveAllCompleteQueuedCampaigns}
            onSkip={skipQueuedCampaign}
            onDuplicatePrevious={duplicatePreviousQueuedCampaign}
          />
        </aside>

        <main className="builder-main-panel">
          <section className="builder-command-header pixel-window p-4 sm:p-5">
            <div className="builder-command-copy">
              <p className="pixel-label">
                Step {slide + 1} of {SLIDES.length}
              </p>
              <h2>{currentSlideLabel}</h2>
              <p>{currentSlideHint}</p>
            </div>
            <div className="builder-progress-track">
              <span style={{ width: `${((slide + 1) / SLIDES.length) * 100}%` }} />
            </div>
            <BuildLevelNav
              slide={slide}
              setup={setup}
              missingFields={missingFields}
              onSelect={(index) => {
                persistActiveQueueDraft(index);
                setSlide(index);
                scrollBuilderToTop();
              }}
            />
            <div className="builder-command-meta">
              {autosaveMessage ? <span className="autosave-chip">{autosaveMessage}</span> : null}
              {!briefId ? (
                <button type="button" className="mini-button" onClick={clearAutosave}>
                  Clear autosave
                </button>
              ) : null}
            </div>
          </section>

          <div className="builder-workspace builder-workspace-console">
            <div key={slide} className="swipe-card builder-question-card pixel-window p-5 sm:p-8">
          {currentPlaybookGuide ? <AdvancedGuidanceDrawer guide={currentPlaybookGuide} /> : null}
          {slide === 0 ? (
            <section className="simple-question">
              <p className="pixel-label">Artist folder</p>
              <h3>Who is the artist?</h3>
              <TextInput
                list="saved-artists"
                value={setup.artist}
                onChange={(event) => updateSetup("artist", event.target.value)}
                placeholder="Nemzzz / Trampolene / Father of Peace"
                className="mega-field"
              />
              <DataList id="saved-artists" options={savedArtists} />
              <p className="helper-copy">
                If this artist already exists, pick it from the dropdown and the
                brief will live in that artist folder.
              </p>
            </section>
          ) : null}

          {slide === 1 ? (
            <section className="simple-question">
              <p className="pixel-label">Project</p>
              <h3>What is the track, tour, or project?</h3>
              <TextInput
                list="saved-projects"
                value={setup.release_title}
                onChange={(event) =>
                  updateSetup("release_title", event.target.value)
                }
                placeholder="Super Powers / South Wales Tour / No Complaints"
                className="mega-field"
              />
              <DataList id="saved-projects" options={savedProjects} />
              <p className="helper-copy">
                This becomes the project name inside the artist folder.
              </p>
            </section>
          ) : null}

          {slide === 2 ? (
            <section className="simple-question">
              <p className="pixel-label">Platform</p>
              <h3>Where is this campaign being built?</h3>
              <div className="choice-grid mt-6">
                {PLATFORM_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      updateSetup("platform", value);
                    }}
                    className={`choice-card ${setup.platform === value ? "choice-card-active" : ""}`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {slide === 3 ? (
            <section className="simple-question">
              <p className="pixel-label">Account + ACID</p>
              <h3>What account and ACID?</h3>
              <div className="mx-auto mt-6 grid max-w-4xl gap-4 md:grid-cols-3">
                <FieldShell label="Account">
                  <TextInput
                    value={setup.account}
                    onChange={(e) => updateSetup("account", e.target.value)}
                    placeholder="Atlantic Records UK / Trade Secret..."
                  />
                </FieldShell>
                <FieldShell label="ACID">
                  <TextInput
                    value={setup.acid}
                    onChange={(e) => updateSetup("acid", e.target.value)}
                    placeholder="80JPUI"
                  />
                </FieldShell>
                <FieldShell label="ASID">
                  <TextInput
                    value={setup.asid}
                    onChange={(e) => updateSetup("asid", e.target.value)}
                    placeholder="ASID if supplied"
                  />
                </FieldShell>
              </div>
              <p className="helper-copy">
                If James has not given ACID or ASID yet, hit Skip.
              </p>
            </section>
          ) : null}

          {slide === 4 ? (
            <section className="simple-question">
              <p className="pixel-label">Objective</p>
              <h3>What is the campaign trying to do?</h3>
              <div className="mx-auto mt-6 grid max-w-3xl gap-4 md:grid-cols-2">
                <FieldShell label="Objective">
                  <TextInput
                    list="objective-presets"
                    value={setup.objective}
                    onChange={(e) => updateSetup("objective", e.target.value)}
                    placeholder="Streaming Conversions"
                  />
                  <DataList
                    id="objective-presets"
                    options={OBJECTIVE_PRESETS}
                  />
                </FieldShell>
                <FieldShell label="Campaign type">
                  <TextInput
                    list="campaign-type-presets"
                    value={setup.campaign_type}
                    onChange={(e) =>
                      updateSetup("campaign_type", e.target.value)
                    }
                    placeholder="Engagement / Sales / Traffic"
                  />
                  <DataList
                    id="campaign-type-presets"
                    options={CAMPAIGN_TYPE_PRESETS}
                  />
                </FieldShell>
              </div>
            </section>
          ) : null}

          {slide === 5 ? (
            <section className="simple-question">
              <p className="pixel-label">Tracking</p>
              <h3>Pixel, conversion location, and event?</h3>
              <div className="mx-auto mt-6 grid max-w-4xl gap-4 md:grid-cols-3">
                <FieldShell label="Conversion location">
                  <TextInput
                    list="conversion-presets"
                    value={setup.conversion_location}
                    onChange={(e) =>
                      updateSetup("conversion_location", e.target.value)
                    }
                    placeholder="Website"
                  />
                  <DataList
                    id="conversion-presets"
                    options={CONVERSION_LOCATION_PRESETS}
                  />
                </FieldShell>
                <FieldShell label="Optimisation event">
                  <TextInput
                    list="optimisation-presets"
                    value={setup.optimisation_event}
                    onChange={(e) =>
                      updateSetup("optimisation_event", e.target.value)
                    }
                    placeholder="FeatureFM_click"
                  />
                  <DataList
                    id="optimisation-presets"
                    options={OPTIMISATION_PRESETS}
                  />
                </FieldShell>
                <FieldShell label="Pixel">
                  <TextInput
                    value={setup.pixel}
                    onChange={(e) => updateSetup("pixel", e.target.value)}
                    placeholder="Pixel ID / name"
                  />
                </FieldShell>
              </div>
              <p className="helper-copy">
                For TikTok views or basic boosts, you can usually skip this.
              </p>
            </section>
          ) : null}

          {slide === 6 ? (
            <section className="simple-question">
              <p className="pixel-label">Budget + dates</p>
              <h3>How much money and when?</h3>
              <div className="mx-auto mt-6 grid max-w-5xl gap-4 md:grid-cols-3">
                <FieldShell label="Budget amount">
                  <TextInput
                    inputMode="decimal"
                    value={setup.budget_amount}
                    onChange={(e) =>
                      updateSetup("budget_amount", e.target.value)
                    }
                    placeholder="250"
                  />
                </FieldShell>
                <FieldShell label="Budget type">
                  <SelectInput
                    value={setup.budget_type}
                    onChange={(e) =>
                      updateSetup("budget_type", e.target.value as BudgetType)
                    }
                  >
                    <option value="">Unknown</option>
                    {BUDGET_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </SelectInput>
                </FieldShell>
                <FieldShell label="Currency">
                  <SelectInput
                    value={setup.currency}
                    onChange={(e) =>
                      updateSetup("currency", e.target.value as Currency)
                    }
                  >
                    <option value="">Unknown</option>
                    {CURRENCY_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </SelectInput>
                </FieldShell>
                <FieldShell label="Start date">
                  <TextInput
                    type="text"
                    inputMode="numeric"
                    value={setup.start_date}
                    onChange={(e) => updateSetup("start_date", e.target.value)}
                    placeholder="18/07/2026"
                  />
                </FieldShell>
                <FieldShell label="End date">
                  <TextInput
                    type="text"
                    inputMode="numeric"
                    value={setup.end_date}
                    onChange={(e) => updateSetup("end_date", e.target.value)}
                    placeholder="21/07/2026"
                  />
                </FieldShell>
                <FieldShell label="Territory summary">
                  <TextInput
                    value={setup.territory_summary}
                    onChange={(e) =>
                      updateSetup("territory_summary", e.target.value)
                    }
                    placeholder="UK / FR NL BE / Global"
                  />
                </FieldShell>
              </div>
            </section>
          ) : null}

          {slide === 7 ? (
            <section className="simple-question">
              <p className="pixel-label">Context</p>
              <h3>Anything else James said?</h3>
              <TextArea
                value={setup.campaign_notes}
                onChange={(e) => updateSetup("campaign_notes", e.target.value)}
                placeholder="Same song.so setup as previous, leave off for JD sign-off, account pending, etc."
                className="mx-auto mt-6 max-w-4xl text-lg"
              />
            </section>
          ) : null}

          {slide === 8 ? (
            <section className="simple-question">
              <p className="pixel-label">{adSetTerms.plural}</p>
              <h3>How many {adSetTerms.lowerPlural}?</h3>
              <TextInput
                type="number"
                min={1}
                max={24}
                value={adSets.length}
                onChange={(event) =>
                  changeAdSetCount(Number(event.target.value))
                }
                className="mega-field mx-auto max-w-60 text-center"
              />
              <p className="helper-copy">
                Example: 1 broad {adSetTerms.lower}, 5 city {adSetTerms.lowerPlural}, or 2 test cells.
              </p>
            </section>
          ) : null}

          {slide === 9 ? (
            <section className="grid gap-5">
              <div className="text-center">
                <p className="pixel-label">{adSetTerms.singular} details</p>
                <h3 className="text-3xl font-black">
                  What does each {adSetTerms.lower} do?
                </h3>
                <p className="helper-copy">
                  Keep it simple: name, targeting notes, optional budget.
                </p>
              </div>

              <div className="pixel-card p-4">
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <FieldShell label={`Same note for every ${adSetTerms.lower}`}>
                      <TextArea
                        value={sameAdSetNotes}
                        onChange={(e) => setSameAdSetNotes(e.target.value)}
                        placeholder="IG only, 18-35, Advantage+ off, no expansion..."
                      />
                    </FieldShell>
                  </div>
                  <div className="grid gap-3">
                    <label className="pixel-panel flex items-center gap-3 p-3">
                      <input
                        type="checkbox"
                        checked={sameBudgetEnabled}
                        onChange={(e) => setSameBudgetEnabled(e.target.checked)}
                        className="h-5 w-5"
                      />
                      <span className="text-sm font-black">
                        Same {adSetTerms.lower} budget?
                      </span>
                    </label>
                    {sameBudgetEnabled ? (
                      <div className="grid grid-cols-2 gap-2">
                        <TextInput
                          placeholder="Amount"
                          inputMode="decimal"
                          value={sameBudgetAmount}
                          onChange={(e) => setSameBudgetAmount(e.target.value)}
                        />
                        <SelectInput
                          value={sameBudgetType}
                          onChange={(e) =>
                            setSameBudgetType(
                              e.target.value as WizardAdSet["budget_type"],
                            )
                          }
                        >
                          <option value="">Type</option>
                          {AD_SET_BUDGET_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </SelectInput>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="pixel-button text-xs"
                      onClick={() => {
                        clearImport();
                        setAdSets((current) =>
                          current.map((adSet) => ({
                            ...adSet,
                            notes: sameAdSetNotes,
                            budget_enabled: sameBudgetEnabled,
                            budget_amount: sameBudgetAmount,
                            budget_type: sameBudgetType,
                          })),
                        );
                      }}
                    >
                      Apply to all {adSetTerms.lowerPlural}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {adSets.map((adSet, adSetIndex) => (
                  <article key={adSet.id} className="pixel-card p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="pixel-label">{adSetTerms.singular} {adSetIndex + 1}</p>
                        <h4 className="mt-1 text-2xl font-black">
                          {adSet.label || `${adSetTerms.singular} ${adSetIndex + 1}`}
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            clearImport();
                            setAdSets((current) => [
                              ...current,
                              duplicateAdSet(adSet),
                            ]);
                          }}
                          className="mini-button"
                        >
                          Duplicate
                        </button>
                        {adSets.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => {
                              clearImport();
                              setAdSets((current) => current.filter((item) => item.id !== adSet.id));
                              setAds((current) => current.map((ad) => ({
                                ...ad,
                                assignedAdSetIds: ad.assignedAdSetIds.filter((id) => id !== adSet.id),
                              })));
                            }}
                            className="mini-button danger"
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                      <FieldShell label={`${adSetTerms.singular} name`}>
                        <TextInput
                          value={adSet.label}
                          onChange={(e) =>
                            updateAdSet(adSet.id, { label: e.target.value })
                          }
                          placeholder="UK prospecting / warm retargeting"
                        />
                      </FieldShell>
                      <div className="lg:col-span-2">
                        <FieldShell label={`What does this ${adSetTerms.lower} do / target?`}>
                          <TextArea
                            value={adSet.notes}
                            onChange={(e) =>
                              updateAdSet(adSet.id, { notes: e.target.value })
                            }
                            placeholder="Locations, age, placements, interest stack, LAL, retargeting notes..."
                          />
                        </FieldShell>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-4">
                      <FieldShell label="Locations">
                        <TextArea
                          value={adSet.locations}
                          onChange={(e) =>
                            updateAdSet(adSet.id, { locations: e.target.value })
                          }
                          placeholder={"UK\nIreland\nLondon"}
                        />
                      </FieldShell>
                      <div className="grid grid-cols-2 gap-2">
                        <FieldShell label="Age min">
                          <TextInput
                            inputMode="numeric"
                            value={adSet.age_min}
                            onChange={(e) =>
                              updateAdSet(adSet.id, { age_min: e.target.value })
                            }
                            placeholder="18"
                          />
                        </FieldShell>
                        <FieldShell label="Age max">
                          <TextInput
                            inputMode="numeric"
                            value={adSet.age_max}
                            onChange={(e) =>
                              updateAdSet(adSet.id, { age_max: e.target.value })
                            }
                            placeholder="35"
                          />
                        </FieldShell>
                      </div>
                      <FieldShell label="Gender">
                        <SelectInput
                          value={adSet.gender}
                          onChange={(e) =>
                            updateAdSet(adSet.id, { gender: e.target.value as Gender })
                          }
                        >
                          <option value="">Unknown</option>
                          {GENDER_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </SelectInput>
                      </FieldShell>
                      <FieldShell label="Targeting type">
                        <SelectInput
                          value={adSet.targeting_type}
                          onChange={(e) =>
                            updateAdSet(adSet.id, {
                              targeting_type: e.target.value as TargetingType,
                            })
                          }
                        >
                          <option value="">Unknown</option>
                          {TARGETING_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </SelectInput>
                      </FieldShell>
                      <div className="lg:col-span-2">
                        <FieldShell label="Placements">
                          <TextArea
                            value={adSet.placements}
                            onChange={(e) =>
                              updateAdSet(adSet.id, { placements: e.target.value })
                            }
                            placeholder={"Instagram Reels\nStories\nTikTok feed"}
                          />
                        </FieldShell>
                      </div>
                      <div className="lg:col-span-2">
                        <FieldShell label="Exclusions">
                          <TextArea
                            value={adSet.exclusions}
                            onChange={(e) =>
                              updateAdSet(adSet.id, { exclusions: e.target.value })
                            }
                            placeholder="Existing purchasers, recent engagers, excluded territories..."
                          />
                        </FieldShell>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                      <label className="pixel-panel flex items-center gap-3 p-4">
                        <input
                          type="checkbox"
                          checked={adSet.budget_enabled}
                          onChange={(e) =>
                            updateAdSet(adSet.id, {
                              budget_enabled: e.target.checked,
                            })
                          }
                          className="h-5 w-5"
                        />
                        <span>
                          <span className="block font-black">
                            {adSetTerms.singular} budget?
                          </span>
                          <span className="text-sm font-semibold pixel-muted">
                            Only if split here.
                          </span>
                        </span>
                      </label>
                      {adSet.budget_enabled ? (
                        <>
                          <FieldShell label="Amount">
                            <TextInput
                              inputMode="decimal"
                              value={adSet.budget_amount}
                              onChange={(e) =>
                                updateAdSet(adSet.id, {
                                  budget_amount: e.target.value,
                                })
                              }
                            />
                          </FieldShell>
                          <FieldShell label="Type">
                            <SelectInput
                              value={adSet.budget_type}
                              onChange={(e) =>
                                updateAdSet(adSet.id, {
                                  budget_type: e.target
                                    .value as WizardAdSet["budget_type"],
                                })
                              }
                            >
                              <option value="">Unknown</option>
                              {AD_SET_BUDGET_OPTIONS.map((value) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </SelectInput>
                          </FieldShell>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {slide === 10 ? (
            <section className="grid gap-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="pixel-label">Ads</p>
                  <h3 className="text-3xl font-black">
                    Create ads once. Send them to any {adSetTerms.lower}.
                  </h3>
                  <p className="helper-copy text-left">
                    Tick 3 of 5 {adSetTerms.lowerPlural}, all of them, or only one.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearImport();
                    setAds((current) => [
                      ...current,
                      newAd(`Ad ${current.length + 1}`, adSetIds),
                    ]);
                  }}
                  className="pixel-button text-xs"
                >
                  + Add ad
                </button>
              </div>

              <div className="grid gap-4">
                {ads.map((ad, adIndex) => (
                  <article key={ad.id} className="pixel-card p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="pixel-label">Ad {adIndex + 1}</p>
                        <h4 className="mt-1 text-2xl font-black">
                          {ad.label || `Ad ${adIndex + 1}`}
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateAd(ad.id, { assignedAdSetIds: adSetIds })
                          }
                          className="mini-button"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateAd(ad.id, { assignedAdSetIds: [] })
                          }
                          className="mini-button"
                        >
                          None
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            clearImport();
                            setAds((current) => [
                              ...current,
                              duplicateAd(ad),
                            ]);
                          }}
                          className="mini-button"
                        >
                          Duplicate
                        </button>
                        {ads.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => {
                              clearImport();
                              setAds((current) =>
                                current.filter((item) => item.id !== ad.id),
                              );
                            }}
                            className="mini-button danger"
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-3">
                      <FieldShell label="Ad / asset name">
                        <TextInput
                          value={ad.label}
                          onChange={(e) =>
                            updateAd(ad.id, { label: e.target.value })
                          }
                          placeholder="Geekin 9x16 / Spark code 1"
                        />
                      </FieldShell>
                      <FieldShell label="Asset type">
                        <SelectInput
                          value={ad.asset_type}
                          onChange={(e) =>
                            updateAd(ad.id, {
                              asset_type: e.target.value as AssetType,
                            })
                          }
                        >
                          <option value="">Unknown</option>
                          {ASSET_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </SelectInput>
                      </FieldShell>
                      <FieldShell label="Destination link">
                        <TextInput
                          value={ad.destination_url}
                          onChange={(e) =>
                            updateAd(ad.id, { destination_url: e.target.value })
                          }
                          placeholder="song.so / Linkfire"
                        />
                      </FieldShell>
                      <FieldShell label="Post URL">
                        <TextInput
                          value={ad.post_url}
                          onChange={(e) =>
                            updateAd(ad.id, { post_url: e.target.value })
                          }
                          placeholder="Instagram / TikTok post URL"
                        />
                      </FieldShell>
                      <FieldShell label="Boost code">
                        <TextInput
                          value={ad.boost_code}
                          onChange={(e) =>
                            updateAd(ad.id, { boost_code: e.target.value })
                          }
                          placeholder="Spark / boost code"
                        />
                      </FieldShell>
                      <div className="lg:col-span-2">
                        <FieldShell
                          label="Asset links"
                          hint="One per line is easiest."
                        >
                          <TextArea
                            value={ad.asset_links}
                            onChange={(e) =>
                              updateAd(ad.id, { asset_links: e.target.value })
                            }
                          />
                        </FieldShell>
                      </div>
                      <FieldShell label="Text / copy">
                        <TextArea
                          value={ad.copy}
                          onChange={(e) =>
                            updateAd(ad.id, { copy: e.target.value })
                          }
                        />
                      </FieldShell>
                      <div className="lg:col-span-3">
                        <FieldShell label="Tiny note">
                          <TextInput
                            value={ad.notes}
                            onChange={(e) =>
                              updateAd(ad.id, { notes: e.target.value })
                            }
                            placeholder="Pick 4x5 cut / use FR video / A-B test"
                          />
                        </FieldShell>
                      </div>
                    </div>

                    <div className="mt-5 border-t-4 border-black pt-4">
                      <p className="pixel-label">Send this ad to</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {adSets.map((adSet, index) => (
                          <label
                            key={adSet.id}
                            className={`pixel-node cursor-pointer p-3 ${ad.assignedAdSetIds.includes(adSet.id) ? "pixel-node-active" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={ad.assignedAdSetIds.includes(adSet.id)}
                              onChange={() =>
                                updateAd(ad.id, {
                                  assignedAdSetIds: toggleAssignedAdSet(
                                    ad,
                                    adSet.id,
                                  ),
                                })
                              }
                              className="sr-only"
                            />
                            <span className="pixel-label block">
                              {adSetTerms.singular} {index + 1}
                            </span>
                            <span className="mt-1 block font-black">
                              {adSet.label || `${adSetTerms.singular} ${index + 1}`}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {slide === 11 ? (
            <section className="grid gap-5">
              <div className="text-center">
                <p className="pixel-label">Review</p>
                <h3 className="text-3xl font-black">
                  Save the campaign folder draft.
                </h3>
                <p className="helper-copy">
                  Click a funnel box to inspect the details.
                </p>
              </div>

              <MissingInfoCoach
                missingFields={missingFields}
                onEditField={(field) => setSlide(slideForMissingField(field))}
              />

              <FunnelPreview setup={setup} adSets={adSets} ads={ads} />

              {missingFields.length > 0 ? (
                <details className="pixel-card p-4">
                  <summary className="cursor-pointer font-mono text-sm font-black uppercase tracking-[0.16em]">
                    Missing info ({missingFields.length})
                  </summary>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {missingFields.map((field) => (
                      <span
                        key={field}
                        className="pixel-missing px-3 py-2 font-mono text-xs font-black"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </details>
              ) : (
                <p className="pixel-ready p-4 font-black">
                  No missing required fields.
                </p>
              )}

              <JsonImportPanel
                onImported={(json, validation) => {
                  applyValidatedJson(
                    json,
                    validation,
                    validation.ok && validation.briefs.length > 1
                      ? "Batch JSON ready to submit"
                      : "JSON mapped into builder",
                  );
                }}
              />

              {submitError ? (
                <p className="pixel-alert p-3 text-sm font-bold">
                  {submitError}
                </p>
              ) : null}
            </section>
          ) : null}
            </div>
          </div>

          {slide === 11 ? null : (
            <BottomFunnelDrawer setup={setup} adSets={adSets} ads={ads} />
          )}
        </main>

        <BuilderInsightPanel
          setup={setup}
          adSets={adSets}
          ads={ads}
          missingFields={missingFields}
          onEditMissing={(field) => setSlide(slideForMissingField(field))}
          onApplyTemplate={applyCampaignTemplate}
        />
      </div>

      <div className="builder-bottom-dock">
        <WizardControls
          slide={slide}
          onBack={previousSlide}
          onSkip={nextSlide}
          onNext={nextSlide}
          onSubmit={submitBrief}
          isPending={isPending}
          briefId={briefId}
          importedJson={importedJson}
          queueTotal={queueTotal}
          hasNextQueuedCampaign={hasNextQueuedCampaign}
        />
      </div>
    </div>
  );
}
