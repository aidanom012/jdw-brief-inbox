import "server-only";

import {
  validateBriefJson,
  type BriefValidationResult,
  type JDWCampaignBrief
} from "@/lib/brief-schema";

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
const DEFAULT_RETRYABLE_STATUS_CODES = new Set([503]);
const UNAVAILABLE_GEMINI_MODELS = new Set([
  "gemini-2.5-flash",
  "models/gemini-2.5-flash",
  "gemini-2.0-flash",
  "models/gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "models/gemini-2.0-flash-lite"
]);
const DEFAULT_MAX_OUTPUT_TOKENS = 4096;
const HARD_MAX_OUTPUT_TOKENS = 12000;
export const MAX_RAW_GEMINI_BRIEF_LENGTH = 50_000;

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: GeminiUsageMetadata;
  error?: {
    message?: string;
  };
};

type JsonObject = Record<string, unknown>;
type JsonSchema = Record<string, unknown>;

type CompactAd = {
  label: string;
  release_title: string;
  asset_type: string;
  asset_links: string[];
  post_url: string;
  boost_code: string;
  destination_url: string;
  copy: string;
  notes: string;
};

type CompactAdSet = {
  label: string;
  locations: string[];
  age_min: string;
  age_max: string;
  gender: string;
  placements: string[];
  budget_amount: string;
  budget_type: string;
  targeting_type: string;
  targeting_details: string;
  exclusions: string;
  notes: string;
  ads: CompactAd[];
};

type CompactBrief = {
  artist: string;
  release_title: string;
  acid: string;
  asid: string;
  platform: string;
  account: string;
  objective: string;
  campaign_type: string;
  conversion_location: string;
  optimisation_event: string;
  pixel: string;
  territory_summary: string;
  start_date: string;
  end_date: string;
  campaign_notes: string;
  budget_type: string;
  budget_amount: string;
  currency: string;
  budget_notes: string;
  ad_sets: CompactAdSet[];
  ads: CompactAd[];
  special_notes: string[];
};

type CompactGeminiPayload = {
  briefs: CompactBrief[];
};

export type GeneratedBriefPayload =
  | JDWCampaignBrief
  | {
      brief_version: "JDW_CAMPAIGN_BRIEF_BATCH_V1";
      briefs: JDWCampaignBrief[];
    };

export type GeminiBriefResult = {
  payload: GeneratedBriefPayload;
  validation: Extract<BriefValidationResult, { ok: true }>;
  usage?: GeminiUsageMetadata;
};

export class GeminiBriefError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly issues?: string[]
  ) {
    super(message);
  }
}

const GEMINI_BRIEF_PROMPT = `Extract campaign brief data from the raw JDW / James Walker note.
Return JSON only matching the response schema. No markdown. No prose.
Use empty strings or empty arrays when information is missing. Do not guess.
Preserve exact supplied values for ACID, ASID, budgets, dates, links, pixel, account, platform, targeting, copy, post URLs, boost codes, and asset links.
If the note contains multiple distinct campaign setups, return one item per setup in briefs[]. Do not merge separate campaigns.`;

function objectSchema(
  properties: Record<string, JsonSchema>,
  propertyOrdering?: string[]
): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required: Object.keys(properties),
    ...(propertyOrdering ? { propertyOrdering } : {})
  };
}

function stringSchema(description?: string): JsonSchema {
  return {
    type: "string",
    ...(description ? { description } : {})
  };
}

function stringArraySchema(description?: string): JsonSchema {
  return {
    type: "array",
    items: { type: "string" },
    ...(description ? { description } : {})
  };
}

const compactAdSchema = objectSchema(
  {
    label: stringSchema("Short ad label from the brief."),
    release_title: stringSchema(),
    asset_type: stringSchema("video, image, carousel, spark_ad, or unknown."),
    asset_links: stringArraySchema("Creative, Box, Drive, Dropbox, TikTok, Meta, or other asset links."),
    post_url: stringSchema("Existing organic post URL if supplied."),
    boost_code: stringSchema("TikTok/Spark/boost code if supplied."),
    destination_url: stringSchema("Landing, streaming, or click-through URL."),
    copy: stringSchema("Ad copy exactly as supplied."),
    notes: stringSchema()
  },
  [
    "label",
    "release_title",
    "asset_type",
    "asset_links",
    "post_url",
    "boost_code",
    "destination_url",
    "copy",
    "notes"
  ]
);

const compactAdSetSchema = objectSchema(
  {
    label: stringSchema("Short ad set label from the brief."),
    locations: stringArraySchema("Audience locations or territory details."),
    age_min: stringSchema("Minimum age exactly as supplied, or empty string."),
    age_max: stringSchema("Maximum age exactly as supplied, or empty string."),
    gender: stringSchema("all, male, female, unknown, or empty string."),
    placements: stringArraySchema("Placements such as IG, FB, TikTok, Reels, Stories."),
    budget_amount: stringSchema("Ad set budget amount exactly as supplied, or empty string."),
    budget_type: stringSchema("daily, lifetime, campaign_total, unknown, or empty string."),
    targeting_type: stringSchema("broad, interest, lookalike, retargeting, advantage_plus, unknown, or empty string."),
    targeting_details: stringSchema("Audience interests, seed artists, LAL source, warm audience, broad notes."),
    exclusions: stringSchema(),
    notes: stringSchema(),
    ads: {
      type: "array",
      items: compactAdSchema
    }
  },
  [
    "label",
    "locations",
    "age_min",
    "age_max",
    "gender",
    "placements",
    "budget_amount",
    "budget_type",
    "targeting_type",
    "targeting_details",
    "exclusions",
    "notes",
    "ads"
  ]
);

const compactBriefSchema = objectSchema(
  {
    artist: stringSchema(),
    release_title: stringSchema(),
    acid: stringSchema(),
    asid: stringSchema(),
    platform: stringSchema("Meta, TikTok, YouTube, Other, unknown, or empty string."),
    account: stringSchema(),
    objective: stringSchema(),
    campaign_type: stringSchema(),
    conversion_location: stringSchema(),
    optimisation_event: stringSchema(),
    pixel: stringSchema(),
    territory_summary: stringSchema(),
    start_date: stringSchema(),
    end_date: stringSchema(),
    campaign_notes: stringSchema(),
    budget_type: stringSchema("daily, lifetime, campaign_total, ad_set_level, unknown, or empty string."),
    budget_amount: stringSchema("Budget amount exactly as supplied, or empty string."),
    currency: stringSchema("GBP, EUR, USD, AUD, CAD, unknown, or empty string."),
    budget_notes: stringSchema(),
    ad_sets: {
      type: "array",
      items: compactAdSetSchema
    },
    ads: {
      type: "array",
      items: compactAdSchema
    },
    special_notes: stringArraySchema()
  },
  [
    "artist",
    "release_title",
    "acid",
    "asid",
    "platform",
    "account",
    "objective",
    "campaign_type",
    "conversion_location",
    "optimisation_event",
    "pixel",
    "territory_summary",
    "start_date",
    "end_date",
    "campaign_notes",
    "budget_type",
    "budget_amount",
    "currency",
    "budget_notes",
    "ad_sets",
    "ads",
    "special_notes"
  ]
);

const compactResponseJsonSchema = objectSchema(
  {
    briefs: {
      type: "array",
      minItems: 1,
      items: compactBriefSchema
    }
  },
  ["briefs"]
);

function briefPayloadFromValidation(
  validation: Extract<BriefValidationResult, { ok: true }>
): GeneratedBriefPayload {
  if (validation.isBatch) {
    return {
      brief_version: "JDW_CAMPAIGN_BRIEF_BATCH_V1",
      briefs: validation.briefs.map((brief) => brief.brief)
    };
  }

  return validation.briefs[0].brief;
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isGeneratedBriefObject(value: unknown): boolean {
  return (
    isJsonObject(value) &&
    (value.brief_version === "JDW_CAMPAIGN_BRIEF_V1" ||
      value.brief_version === "JDW_CAMPAIGN_BRIEF_BATCH_V1")
  );
}

function extractGenerateContentText(response: GeminiGenerateContentResponse): string {
  const text = response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new GeminiBriefError("Gemini did not return any JSON.", 502);
  }

  return text;
}

function stripMarkdownJsonFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function findBalancedJsonCandidate(text: string): string | null {
  const cleaned = stripMarkdownJsonFence(text);
  const start = cleaned.search(/[\[{]/);
  if (start < 0) {
    return null;
  }

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      stack.push("}");
      continue;
    }

    if (char === "[") {
      stack.push("]");
      continue;
    }

    if (char === "}" || char === "]") {
      const expected = stack.pop();
      if (expected !== char) {
        return null;
      }

      if (stack.length === 0) {
        return cleaned.slice(start, index + 1);
      }
    }
  }

  return null;
}

function normaliseGeneratedJsonShape(value: unknown): unknown {
  if (Array.isArray(value)) {
    const briefObjects = value.filter(isJsonObject);
    if (briefObjects.length > 0) {
      return {
        briefs: briefObjects
      };
    }
  }

  if (isJsonObject(value) && Array.isArray(value.briefs)) {
    return value;
  }

  if (isGeneratedBriefObject(value)) {
    return value;
  }

  if (isJsonObject(value)) {
    return {
      briefs: [value]
    };
  }

  return value;
}

function parseJsonOnly(text: string): unknown {
  const attempts = [text.trim(), stripMarkdownJsonFence(text)];
  const balancedCandidate = findBalancedJsonCandidate(text);
  if (balancedCandidate) {
    attempts.push(balancedCandidate);
  }

  const uniqueAttempts = Array.from(new Set(attempts.filter(Boolean)));
  for (const candidate of uniqueAttempts) {
    try {
      return normaliseGeneratedJsonShape(JSON.parse(candidate));
    } catch {
      // Try the next candidate without spending another Gemini request.
    }
  }

  throw new GeminiBriefError("Gemini returned text that was not valid JSON.", 502, [
    stripMarkdownJsonFence(text).slice(0, 500)
  ]);
}

function validationIssues(validation: BriefValidationResult): string[] | undefined {
  return validation.ok ? undefined : validation.issues;
}

function cleanDetail(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.trim().replace(/\s+/g, " ").slice(0, 700);
}

function geminiErrorDetail(payload: unknown): string | null {
  if (!isJsonObject(payload)) {
    return null;
  }

  const error = payload.error;
  if (isJsonObject(error)) {
    return cleanDetail(error.message) || cleanDetail(error.status) || cleanDetail(error.code);
  }

  return cleanDetail(payload.message) || cleanDetail(payload.error_description);
}

function apiIssue(source: string, model: string, response: Response, payload: unknown): string {
  const detail = geminiErrorDetail(payload);
  return detail
    ? `${source} using ${model} returned ${response.status}: ${detail}`
    : `${source} using ${model} returned ${response.status} ${response.statusText || "without details"}.`;
}

function isCredentialOrQuotaError(error: GeminiBriefError): boolean {
  const detail = [error.message, ...(error.issues || [])].join(" ").toLowerCase();
  return /api key|permission|billing|quota|rate limit|unauthorized|forbidden|not enabled|disabled|location/.test(
    detail
  );
}

function normaliseModelName(model: string): string {
  return model.trim().replace(/^models\//, "");
}

function splitConfiguredFallbackModels(): string[] {
  return (process.env.GEMINI_FALLBACK_MODELS || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

function configuredModels(): string[] {
  const primaryModel = normaliseModelName(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL);
  const models = [primaryModel, ...splitConfiguredFallbackModels().map(normaliseModelName)].filter(
    (model) => !UNAVAILABLE_GEMINI_MODELS.has(model)
  );

  const uniqueModels = Array.from(new Set(models));
  return uniqueModels.length > 0 ? uniqueModels : [DEFAULT_GEMINI_MODEL];
}

function configuredMaxOutputTokens(): number {
  const rawValue = process.env.GEMINI_MAX_OUTPUT_TOKENS?.trim();
  if (!rawValue) {
    return DEFAULT_MAX_OUTPUT_TOKENS;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return DEFAULT_MAX_OUTPUT_TOKENS;
  }

  return Math.min(Math.floor(parsedValue), HARD_MAX_OUTPUT_TOKENS);
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new GeminiBriefError("Gemini returned an unreadable response.", 502, [
      raw.trim().slice(0, 500)
    ]);
  }
}

function retryDelayMs(attemptIndex: number): number {
  return 500 * Math.pow(2, attemptIndex);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postGeminiJson(
  endpoint: string,
  apiKey: string,
  body: unknown,
  maxAttempts = 3
): Promise<{ response: Response; payload: unknown }> {
  let lastNetworkError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify(body)
      });
      const payload = await readJsonResponse(response);

      if (
        response.ok ||
        attempt === maxAttempts - 1 ||
        !DEFAULT_RETRYABLE_STATUS_CODES.has(response.status)
      ) {
        return { response, payload };
      }
    } catch (error) {
      lastNetworkError = error instanceof Error ? error : new Error("Network request failed.");
      if (attempt === maxAttempts - 1) {
        break;
      }
    }

    await sleep(retryDelayMs(attempt));
  }

  throw new GeminiBriefError("Gemini API was unreachable or temporarily overloaded.", 502, [
    lastNetworkError?.message || "The model returned repeated temporary capacity errors."
  ]);
}

function asRecord(value: unknown): JsonObject {
  return isJsonObject(value) ? value : {};
}

function asString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function stringOrNull(value: unknown): string | null {
  const text = asString(value);
  if (!text) {
    return null;
  }

  const lowered = text.toLowerCase();
  if (["n/a", "na", "none", "null", "undefined", "not specified", "tbc", "tbd"].includes(lowered)) {
    return null;
  }

  return text;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(asString)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = asString(value).replace(/,/g, "");
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T | null = null
): T | null {
  const normalized = asString(value).toLowerCase().replace(/[\s-]+/g, "_");
  const found = allowed.find((item) => item.toLowerCase() === normalized);
  return found || fallback;
}

function platformValue(value: unknown): JDWCampaignBrief["campaign"]["platform"] {
  const normalized = asString(value).toLowerCase();
  if (normalized.includes("meta") || normalized.includes("facebook") || normalized.includes("instagram")) {
    return "Meta";
  }
  if (normalized.includes("tiktok") || normalized.includes("tik tok")) {
    return "TikTok";
  }
  if (normalized.includes("youtube")) {
    return "YouTube";
  }
  if (normalized.includes("other")) {
    return "Other";
  }
  return null;
}

function currencyValue(value: unknown, fallbackText = ""): JDWCampaignBrief["budget"]["currency"] {
  const normalized = `${asString(value)} ${fallbackText}`.toLowerCase();
  if (normalized.includes("gbp") || normalized.includes("£")) return "GBP";
  if (normalized.includes("eur") || normalized.includes("€")) return "EUR";
  if (normalized.includes("usd") || normalized.includes("$")) return "USD";
  if (normalized.includes("aud")) return "AUD";
  if (normalized.includes("cad")) return "CAD";
  if (normalized.includes("unknown")) return "unknown";
  return null;
}

function budgetTypeValue(value: unknown): JDWCampaignBrief["budget"]["type"] {
  const normalized = asString(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized.includes("daily")) return "daily";
  if (normalized.includes("lifetime")) return "lifetime";
  if (normalized.includes("campaign_total") || normalized.includes("total")) return "campaign_total";
  if (normalized.includes("ad_set")) return "ad_set_level";
  if (normalized.includes("unknown")) return "unknown";
  return null;
}

function adSetBudgetTypeValue(value: unknown): NonNullable<JDWCampaignBrief["ad_sets"][number]["budget_type"]> | null {
  const normalized = budgetTypeValue(value);
  return normalized === "ad_set_level" ? "unknown" : normalized;
}

function genderValue(value: unknown): JDWCampaignBrief["ad_sets"][number]["gender"] {
  const normalized = asString(value).toLowerCase();
  if (normalized.includes("female") || normalized.includes("women")) return "female";
  if (normalized.includes("male") || normalized.includes("men")) return "male";
  if (normalized.includes("all") || normalized.includes("any")) return "all";
  if (normalized.includes("unknown")) return "unknown";
  return "unknown";
}

function targetingTypeValue(value: unknown): JDWCampaignBrief["ad_sets"][number]["targeting_type"] {
  const normalized = asString(value).toLowerCase();
  if (normalized.includes("advantage")) return "advantage_plus";
  if (normalized.includes("lookalike") || normalized.includes("lal")) return "lookalike";
  if (normalized.includes("retarget") || normalized.includes("warm")) return "retargeting";
  if (normalized.includes("interest") || normalized.includes("seed")) return "interest";
  if (normalized.includes("broad")) return "broad";
  if (normalized.includes("unknown")) return "unknown";
  return "unknown";
}

function assetTypeValue(value: unknown): JDWCampaignBrief["ads"][number]["asset_type"] {
  const normalized = asString(value).toLowerCase();
  if (normalized.includes("spark")) return "spark_ad";
  if (normalized.includes("carousel")) return "carousel";
  if (normalized.includes("image") || normalized.includes("photo") || normalized.includes("poster")) return "image";
  if (normalized.includes("video") || normalized.includes("reel") || normalized.includes("tiktok")) return "video";
  if (normalized.includes("unknown")) return "unknown";
  return "unknown";
}

function compactAdToJdw(value: unknown): JDWCampaignBrief["ads"][number] {
  const ad = asRecord(value);
  return {
    label: stringOrNull(ad.label),
    release_title: stringOrNull(ad.release_title),
    asset_type: assetTypeValue(ad.asset_type),
    asset_links: strings(ad.asset_links),
    post_url: stringOrNull(ad.post_url),
    boost_code: stringOrNull(ad.boost_code),
    destination_url: stringOrNull(ad.destination_url),
    copy: stringOrNull(ad.copy),
    notes: stringOrNull(ad.notes)
  };
}

function compactAdSetToJdw(value: unknown): JDWCampaignBrief["ad_sets"][number] {
  const adSet = asRecord(value);
  return {
    label: stringOrNull(adSet.label),
    locations: strings(adSet.locations),
    age_min: parseNumber(adSet.age_min),
    age_max: parseNumber(adSet.age_max),
    gender: genderValue(adSet.gender),
    placements: strings(adSet.placements),
    targeting_type: targetingTypeValue(adSet.targeting_type),
    targeting_details: stringOrNull(adSet.targeting_details),
    exclusions: stringOrNull(adSet.exclusions),
    budget_amount: parseNumber(adSet.budget_amount),
    budget_type: adSetBudgetTypeValue(adSet.budget_type),
    notes: stringOrNull(adSet.notes),
    ads: Array.isArray(adSet.ads) ? adSet.ads.map(compactAdToJdw) : []
  };
}

function compactBriefToJdw(value: unknown): JDWCampaignBrief {
  const brief = asRecord(value);
  const budgetAmountText = asString(brief.budget_amount);

  return {
    brief_version: "JDW_CAMPAIGN_BRIEF_V1",
    source: {
      source_type: "quick_note",
      source_title: "Gemini raw brief parser",
      source_date: null,
      original_item_label: null,
      source_notes: []
    },
    build: {
      action: "new_campaign",
      existing_campaign_name: null,
      approval_required: null,
      launch_instruction: null,
      priority: "normal"
    },
    campaign: {
      artist: stringOrNull(brief.artist),
      release_title: stringOrNull(brief.release_title),
      acid: stringOrNull(brief.acid),
      asid: stringOrNull(brief.asid),
      platform: platformValue(brief.platform),
      account: stringOrNull(brief.account),
      objective: stringOrNull(brief.objective),
      campaign_type: stringOrNull(brief.campaign_type),
      conversion_location: stringOrNull(brief.conversion_location),
      optimisation_event: stringOrNull(brief.optimisation_event),
      pixel: stringOrNull(brief.pixel),
      territory_summary: stringOrNull(brief.territory_summary),
      start_date: stringOrNull(brief.start_date),
      end_date: stringOrNull(brief.end_date),
      campaign_notes: stringOrNull(brief.campaign_notes)
    },
    budget: {
      type: budgetTypeValue(brief.budget_type),
      amount: parseNumber(brief.budget_amount),
      currency: currencyValue(brief.currency, budgetAmountText),
      notes: stringOrNull(brief.budget_notes)
    },
    ad_sets: Array.isArray(brief.ad_sets) ? brief.ad_sets.map(compactAdSetToJdw) : [],
    ads: Array.isArray(brief.ads) ? brief.ads.map(compactAdToJdw) : [],
    special_notes: strings(brief.special_notes),
    missing_required_fields: []
  };
}

function compactPayloadToJdwPayload(value: unknown): unknown {
  if (isGeneratedBriefObject(value)) {
    return value;
  }

  const normalized = normaliseGeneratedJsonShape(value);
  if (!isJsonObject(normalized) || !Array.isArray(normalized.briefs)) {
    return normalized;
  }

  const briefs = normalized.briefs.map(compactBriefToJdw);
  if (briefs.length === 1) {
    return briefs[0];
  }

  return {
    brief_version: "JDW_CAMPAIGN_BRIEF_BATCH_V1",
    briefs
  };
}

async function generateWithGenerateContentApi(
  apiKey: string,
  model: string,
  rawBrief: string
): Promise<{ generated: unknown; usage?: GeminiUsageMetadata }> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

  const body = {
    systemInstruction: {
      parts: [{ text: GEMINI_BRIEF_PROMPT }]
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: rawBrief
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0,
      topP: 0.1,
      candidateCount: 1,
      maxOutputTokens: configuredMaxOutputTokens(),
      responseMimeType: "application/json",
      responseJsonSchema: compactResponseJsonSchema
    }
  };

  const { response, payload } = await postGeminiJson(endpoint, apiKey, body);

  if (!response.ok) {
    const message =
      response.status === 503
        ? "Gemini is temporarily overloaded. Try the same brief again in a moment."
        : "Gemini could not generate this brief.";

    throw new GeminiBriefError(message, 502, [
      apiIssue("generateContent API", model, response, payload)
    ]);
  }

  const typedPayload = payload as GeminiGenerateContentResponse;
  const parsed = parseJsonOnly(extractGenerateContentText(typedPayload));
  return {
    generated: compactPayloadToJdwPayload(parsed),
    usage: typedPayload.usageMetadata
  };
}

function validateGeneratedBrief(
  generated: unknown,
  usage?: GeminiUsageMetadata
): GeminiBriefResult {
  const rawGeneratedJson = JSON.stringify(generated);
  const validation = validateBriefJson(rawGeneratedJson);

  if (!validation.ok) {
    throw new GeminiBriefError(validation.message, 422, validationIssues(validation));
  }

  return {
    payload: briefPayloadFromValidation(validation),
    validation,
    usage
  };
}

function shouldTryNextModel(error: GeminiBriefError): boolean {
  if (isCredentialOrQuotaError(error)) {
    return false;
  }

  const detail = [error.message, ...(error.issues || [])].join(" ").toLowerCase();
  return /404|not found|not supported|no longer available|not available/.test(detail);
}

export async function generateGeminiBrief(rawBrief: string): Promise<GeminiBriefResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiBriefError("Gemini is not configured for this app yet.", 500);
  }

  let lastError: GeminiBriefError | null = null;

  for (const model of configuredModels()) {
    try {
      const result = await generateWithGenerateContentApi(apiKey, model, rawBrief);
      return validateGeneratedBrief(result.generated, result.usage);
    } catch (error) {
      if (!(error instanceof GeminiBriefError)) {
        throw error;
      }

      lastError = error;
      if (!shouldTryNextModel(error)) {
        throw error;
      }
    }
  }

  throw (
    lastError ||
    new GeminiBriefError("Gemini could not generate this brief.", 502, [
      "All configured Gemini models failed."
    ])
  );
}
