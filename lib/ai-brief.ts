import "server-only";

import {
  validateBriefJson,
  type BriefValidationResult,
  type JDWCampaignBrief
} from "@/lib/brief-schema";

const DEFAULT_PROVIDER = "groq";
const DEFAULT_GROQ_MODEL_CHAIN = [
  "openai/gpt-oss-120b",
  "qwen/qwen3-32b",
  "openai/gpt-oss-20b"
];
const DEFAULT_MAX_COMPLETION_TOKENS = 2048;
const HARD_MAX_COMPLETION_TOKENS = 8192;
export const MAX_RAW_AI_BRIEF_LENGTH = 50_000;

type JsonObject = Record<string, unknown>;
type JsonSchema = Record<string, unknown>;

type AiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

type AiModelAttempt = {
  model: string;
  ok: boolean;
  note: string;
};

type GroqChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      refusal?: string | null;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

type CompactAd = {
  label: string | null;
  release_title: string | null;
  asset_type: string | null;
  asset_links: string[];
  post_url: string | null;
  boost_code: string | null;
  destination_url: string | null;
  copy: string | null;
  notes: string | null;
};

type CompactAdSet = {
  label: string | null;
  locations: string[];
  age_min: number | null;
  age_max: number | null;
  gender: string | null;
  placements: string[];
  budget_amount: number | null;
  budget_type: string | null;
  targeting_type: string | null;
  targeting_details: string | null;
  exclusions: string | null;
  notes: string | null;
  ads: CompactAd[];
};

type CompactBrief = {
  artist: string | null;
  release_title: string | null;
  platform: string | null;
  account: string | null;
  acid: string | null;
  asid: string | null;
  objective: string | null;
  campaign_type: string | null;
  conversion_location: string | null;
  optimisation_event: string | null;
  pixel: string | null;
  budget_type: string | null;
  budget_amount: number | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
  territory_summary: string | null;
  campaign_notes: string | null;
  ad_sets: CompactAdSet[];
  ads: CompactAd[];
  special_notes: string[];
};

type CompactGroqPayload = {
  briefs: CompactBrief[];
};

export type GeneratedBriefPayload =
  | JDWCampaignBrief
  | {
      brief_version: "JDW_CAMPAIGN_BRIEF_BATCH_V1";
      briefs: JDWCampaignBrief[];
    };

export type AiBriefResult = {
  payload: GeneratedBriefPayload;
  validation: Extract<BriefValidationResult, { ok: true }>;
  usage?: AiUsageMetadata;
  provider: string;
  model: string;
  attempts: AiModelAttempt[];
};

export class AiBriefError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly issues?: string[]
  ) {
    super(message);
  }
}

const AI_BRIEF_SYSTEM_PROMPT = `You extract paid-social campaign brief details from messy JDW / James Walker notes.
Return exactly one valid JSON object only. The first character must be { and the last character must be }. No markdown. No prose. No comments.
Never output brief_version, source, build, missing_required_fields, or the full JDW app schema.
Return only this compact object shape: {"briefs":[{"artist":"","release_title":"","platform":"","account":"","acid":"","asid":"","objective":"","campaign_type":"","conversion_location":"","optimisation_event":"","pixel":"","budget_type":"","budget_amount":"","currency":"","start_date":"","end_date":"","territory_summary":"","campaign_notes":"","ad_sets":[{"label":"","locations":[],"age_min":"","age_max":"","gender":"","placements":[],"budget_amount":"","budget_type":"","targeting_type":"","targeting_details":"","exclusions":"","notes":"","ads":[{"label":"","release_title":"","asset_type":"","asset_links":[],"post_url":"","boost_code":"","destination_url":"","copy":"","notes":""}]}],"ads":[],"special_notes":[]}]}
Use empty strings for unknown scalar values and empty arrays for unknown lists. Keep output compact.
Preserve exact supplied links, boost codes, ACID, ASID, budgets, dates, platforms, accounts, pixels, optimisation events, targeting, copy, and notes.
If there are multiple distinct campaign setups, return one item per setup in briefs[].`;

function objectSchema(properties: Record<string, JsonSchema>): JsonSchema {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false
  };
}

function nullableString(description?: string): JsonSchema {
  return {
    type: ["string", "null"],
    ...(description ? { description } : {})
  };
}

function nullableNumber(description?: string): JsonSchema {
  return {
    type: ["number", "null"],
    ...(description ? { description } : {})
  };
}

function stringArray(description?: string): JsonSchema {
  return {
    type: "array",
    items: { type: "string" },
    ...(description ? { description } : {})
  };
}

const compactAdSchema = objectSchema({
  label: nullableString("Short ad label from the brief."),
  release_title: nullableString("Track/release title for this ad if supplied."),
  asset_type: nullableString("video, image, carousel, spark_ad, or null."),
  asset_links: stringArray("Creative, Box, Drive, Dropbox, TikTok, Meta, or other asset links."),
  post_url: nullableString("Existing organic post URL if supplied."),
  boost_code: nullableString("TikTok/Spark/boost code if supplied."),
  destination_url: nullableString("Landing, streaming, or click-through URL."),
  copy: nullableString("Ad copy exactly as supplied."),
  notes: nullableString()
});

const compactAdSetSchema = objectSchema({
  label: nullableString("Short ad set label from the brief."),
  locations: stringArray("Audience locations or territory details."),
  age_min: nullableNumber("Minimum age as a number, or null."),
  age_max: nullableNumber("Maximum age as a number, or null."),
  gender: nullableString("all, male, female, unknown, or null."),
  placements: stringArray("Placements such as IG, FB, TikTok, Reels, Stories."),
  budget_amount: nullableNumber("Ad set budget amount as a number, or null."),
  budget_type: nullableString("daily, lifetime, campaign_total, unknown, or null."),
  targeting_type: nullableString("broad, interest, lookalike, retargeting, advantage_plus, unknown, or null."),
  targeting_details: nullableString("Interests, seed artists, LAL source, warm audience, broad notes."),
  exclusions: nullableString(),
  notes: nullableString(),
  ads: {
    type: "array",
    items: compactAdSchema
  }
});

const compactBriefSchema = objectSchema({
  artist: nullableString(),
  release_title: nullableString(),
  platform: nullableString("Meta, TikTok, YouTube, Other, or null."),
  account: nullableString(),
  acid: nullableString(),
  asid: nullableString(),
  objective: nullableString(),
  campaign_type: nullableString(),
  conversion_location: nullableString(),
  optimisation_event: nullableString(),
  pixel: nullableString(),
  budget_type: nullableString("daily, lifetime, campaign_total, ad_set_level, unknown, or null."),
  budget_amount: nullableNumber("Campaign budget as a number, or null."),
  currency: nullableString("GBP, EUR, USD, AUD, CAD, unknown, or null."),
  start_date: nullableString(),
  end_date: nullableString(),
  territory_summary: nullableString(),
  campaign_notes: nullableString(),
  ad_sets: {
    type: "array",
    items: compactAdSetSchema
  },
  ads: {
    type: "array",
    items: compactAdSchema
  },
  special_notes: stringArray()
});

const compactResponseJsonSchema = objectSchema({
  briefs: {
    type: "array",
    minItems: 1,
    items: compactBriefSchema
  }
});

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

function asRecord(value: unknown): JsonObject {
  return isJsonObject(value) ? value : {};
}

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function stringOrNull(value: unknown): string | null {
  const text = asString(value);
  if (!text) return null;
  const lowered = text.toLowerCase();
  if (["n/a", "na", "none", "null", "undefined", "not specified", "tbc", "tbd", "unknown"].includes(lowered)) {
    return null;
  }
  return text;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(asString).map((item) => item.trim()).filter(Boolean)));
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = asString(value).replace(/,/g, "");
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function platformValue(value: unknown): JDWCampaignBrief["campaign"]["platform"] {
  const normalized = asString(value).toLowerCase();
  if (normalized.includes("meta") || normalized.includes("facebook") || normalized.includes("instagram")) return "Meta";
  if (normalized.includes("tiktok") || normalized.includes("tik tok")) return "TikTok";
  if (normalized.includes("youtube")) return "YouTube";
  if (normalized.includes("other")) return "Other";
  return null;
}

function currencyValue(value: unknown, fallbackText = ""): JDWCampaignBrief["budget"]["currency"] {
  const normalized = `${asString(value)} ${fallbackText}`.toLowerCase();
  if (normalized.includes("gbp") || normalized.includes("£")) return "GBP";
  if (normalized.includes("eur") || normalized.includes("€")) return "EUR";
  if (normalized.includes("usd") || normalized.includes("$") || normalized.includes("dollar")) return "USD";
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

function getFirstRegex(rawBrief: string, pattern: RegExp): string | null {
  const match = rawBrief.match(pattern);
  return match?.[1]?.trim() || null;
}

function localFacts(rawBrief: string) {
  const urls = Array.from(new Set(rawBrief.match(/https?:\/\/[^\s)\]>"']+/gi) || []));
  const boostCodes = Array.from(new Set(rawBrief.match(/#[A-Za-z0-9+/=_-]{20,}/g) || []));
  const acid = getFirstRegex(rawBrief, /\bACID\s*[:#-]?\s*([A-Z0-9_-]{3,})/i);
  const asid = getFirstRegex(rawBrief, /\bASID\s*[:#-]?\s*([A-Z0-9_-]{3,})/i);
  const budgetMatch = rawBrief.match(/[£€$]\s?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s?(?:gbp|eur|usd|aud|cad)\b/i)?.[0] || null;
  return { acid, asid, urls: urls.slice(0, 30), boostCodes: boostCodes.slice(0, 20), budgetHint: budgetMatch };
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

function compactBriefToJdw(value: unknown, rawBrief: string): JDWCampaignBrief {
  const brief = asRecord(value);
  const facts = localFacts(rawBrief);
  const budgetAmount = parseNumber(brief.budget_amount) ?? parseNumber(facts.budgetHint);
  const specialNotes = strings(brief.special_notes);

  if (facts.boostCodes.length && !specialNotes.some((note) => note.toLowerCase().includes("boost"))) {
    specialNotes.push(`Detected boost codes: ${facts.boostCodes.join(" ")}`);
  }

  return {
    brief_version: "JDW_CAMPAIGN_BRIEF_V1",
    source: {
      source_type: "quick_note",
      source_title: "Groq raw brief parser",
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
      acid: stringOrNull(brief.acid) ?? facts.acid,
      asid: stringOrNull(brief.asid) ?? facts.asid,
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
      amount: budgetAmount,
      currency: currencyValue(brief.currency, facts.budgetHint || ""),
      notes: null
    },
    ad_sets: Array.isArray(brief.ad_sets) ? brief.ad_sets.map(compactAdSetToJdw) : [],
    ads: Array.isArray(brief.ads) ? brief.ads.map(compactAdToJdw) : [],
    special_notes: specialNotes,
    missing_required_fields: []
  };
}

function payloadToJdwPayload(value: unknown, rawBrief: string): unknown {
  if (isGeneratedBriefObject(value)) return value;

  if (Array.isArray(value)) {
    return payloadToJdwPayload({ briefs: value }, rawBrief);
  }

  if (!isJsonObject(value)) return value;

  const rawBriefs = Array.isArray(value.briefs) ? value.briefs : [value];
  const allAlreadyFullBriefs = rawBriefs.length > 0 && rawBriefs.every(
    (brief) => isJsonObject(brief) && brief.brief_version === "JDW_CAMPAIGN_BRIEF_V1"
  );

  if (allAlreadyFullBriefs) {
    return rawBriefs.length === 1
      ? rawBriefs[0]
      : { brief_version: "JDW_CAMPAIGN_BRIEF_BATCH_V1", briefs: rawBriefs };
  }

  const briefs = rawBriefs.map((brief) => compactBriefToJdw(brief, rawBrief));
  return briefs.length === 1
    ? briefs[0]
    : { brief_version: "JDW_CAMPAIGN_BRIEF_BATCH_V1", briefs };
}

function briefPayloadFromValidation(validation: Extract<BriefValidationResult, { ok: true }>): GeneratedBriefPayload {
  if (validation.isBatch) {
    return {
      brief_version: "JDW_CAMPAIGN_BRIEF_BATCH_V1",
      briefs: validation.briefs.map((brief) => brief.brief)
    };
  }
  return validation.briefs[0].brief;
}

function parseJsonStrict(text: string, finishReason?: string | null): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text.trim();

    const fencedJson = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
    if (fencedJson) {
      try {
        return JSON.parse(fencedJson);
      } catch {
        // Fall through to the object extraction below.
      }
    }

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        // Fall through to the user-facing parser error.
      }
    }

    const message = finishReason === "length"
      ? "Groq returned JSON but it was cut off before it completed. Raise GROQ_MAX_COMPLETION_TOKENS or shorten the pasted brief."
      : "Groq returned a response that could not be parsed as JSON.";
    throw new AiBriefError(message, 502, [cleaned.slice(0, 900)]);
  }
}

function configuredProvider(): string {
  return (process.env.AI_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase();
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function configuredGroqModels(): string[] {
  const configuredChain = process.env.GROQ_MODEL_CHAIN || process.env.GROQ_MODELS;
  if (configuredChain?.trim()) {
    return uniqueStrings(configuredChain.split(","));
  }

  const legacyModel = process.env.GROQ_MODEL?.trim();
  return uniqueStrings([...DEFAULT_GROQ_MODEL_CHAIN, legacyModel || ""]);
}

function configuredMaxCompletionTokens(): number {
  const rawValue = process.env.GROQ_MAX_COMPLETION_TOKENS?.trim();
  if (!rawValue) return DEFAULT_MAX_COMPLETION_TOKENS;
  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return DEFAULT_MAX_COMPLETION_TOKENS;
  return Math.min(Math.floor(parsedValue), HARD_MAX_COMPLETION_TOKENS);
}

function shouldRetryWithoutGroqJsonMode(response: Response, payload: unknown): boolean {
  if (response.status !== 400 || !isJsonObject(payload)) return false;
  const error = isJsonObject(payload.error) ? payload.error : payload;
  const text = [
    error.message,
    error.type,
    error.code,
    error.failed_generation,
    payload.failed_generation
  ]
    .map((value) => (typeof value === "string" ? value : ""))
    .join(" ")
    .toLowerCase();

  return text.includes("failed_generation") || text.includes("validate json") || text.includes("json");
}

function groqRequestBody(model: string, rawBrief: string, facts: ReturnType<typeof localFacts>, useJsonMode: boolean): JsonObject {
  return {
    model,
    temperature: 0,
    messages: [
      { role: "system", content: AI_BRIEF_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Local deterministic hints, do not ignore exact matches:\n${JSON.stringify(facts)}\n\nRaw JDW brief:\n${rawBrief}`
      }
    ],
    max_completion_tokens: configuredMaxCompletionTokens(),
    ...(useJsonMode ? { response_format: { type: "json_object" } } : {})
  };
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new AiBriefError("AI provider returned an unreadable response.", 502, [raw.trim().slice(0, 500)]);
  }
}

function providerErrorDetail(payload: unknown): string | null {
  if (!isJsonObject(payload)) return null;
  const error = payload.error;
  if (isJsonObject(error)) {
    return stringOrNull(error.message) || stringOrNull(error.type) || stringOrNull(error.code);
  }
  return stringOrNull(payload.message) || stringOrNull(payload.error_description);
}

function apiIssue(source: string, model: string, response: Response, payload: unknown): string {
  const detail = providerErrorDetail(payload);
  return detail
    ? `${source} using ${model} returned ${response.status}: ${detail}`
    : `${source} using ${model} returned ${response.status} ${response.statusText || "without details"}.`;
}

function groqUsageToAiUsage(usage: GroqChatCompletionResponse["usage"] | undefined): AiUsageMetadata | undefined {
  if (!usage) return undefined;
  return {
    promptTokenCount: usage.prompt_tokens,
    candidatesTokenCount: usage.completion_tokens,
    totalTokenCount: usage.total_tokens
  };
}

async function postGroqChatCompletion(apiKey: string, body: JsonObject): Promise<{ response: Response; payload: unknown }> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return {
    response,
    payload: await readJsonResponse(response)
  };
}

async function generateWithGroqModel(rawBrief: string, model: string): Promise<{ generated: unknown; usage?: AiUsageMetadata; model: string; note: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AiBriefError("Groq is not configured for this app yet. Add GROQ_API_KEY in Vercel/env.", 500);
  }

  const facts = localFacts(rawBrief);
  let retriedWithoutJsonMode = false;
  let { response, payload } = await postGroqChatCompletion(
    apiKey,
    groqRequestBody(model, rawBrief, facts, true)
  );

  if (!response.ok && shouldRetryWithoutGroqJsonMode(response, payload)) {
    retriedWithoutJsonMode = true;
    ({ response, payload } = await postGroqChatCompletion(
      apiKey,
      groqRequestBody(model, rawBrief, facts, false)
    ));
  }

  if (!response.ok) {
    const issue = apiIssue("Groq Chat Completions API", model, response, payload);
    throw new AiBriefError("Groq could not generate this brief.", response.status >= 400 && response.status < 500 ? response.status : 502, [issue]);
  }

  const typedPayload = payload as GroqChatCompletionResponse;
  const choice = typedPayload.choices?.[0];
  const content = choice?.message?.content?.trim();
  const refusal = choice?.message?.refusal?.trim();

  if (refusal) {
    throw new AiBriefError("Groq refused to process this brief.", 502, [refusal.slice(0, 500)]);
  }

  if (!content) {
    throw new AiBriefError("Groq did not return any JSON.", 502);
  }

  const parsed = parseJsonStrict(content, choice?.finish_reason);
  return {
    generated: payloadToJdwPayload(parsed, rawBrief),
    usage: groqUsageToAiUsage(typedPayload.usage),
    model,
    note: retriedWithoutJsonMode
      ? "Generated after retrying without Groq JSON mode."
      : "Generated with Groq JSON mode."
  };
}

function validateGeneratedBrief(
  generated: unknown,
  usage: AiUsageMetadata | undefined,
  provider: string,
  model: string,
  attempts: AiModelAttempt[]
): AiBriefResult {
  const rawGeneratedJson = JSON.stringify(generated);
  const validation = validateBriefJson(rawGeneratedJson);

  if (!validation.ok) {
    throw new AiBriefError(validation.message, 422, validation.issues);
  }

  return {
    payload: briefPayloadFromValidation(validation),
    validation,
    usage,
    provider,
    model,
    attempts
  };
}

export async function generateAiBrief(rawBrief: string): Promise<AiBriefResult> {
  const provider = configuredProvider();

  if (provider !== "groq") {
    throw new AiBriefError(`Unsupported AI_PROVIDER "${provider}". Set AI_PROVIDER=groq.`, 500);
  }

  const attempts: AiModelAttempt[] = [];
  const models = configuredGroqModels();

  for (const model of models) {
    try {
      const result = await generateWithGroqModel(rawBrief, model);
      const successfulAttempt = { model, ok: true, note: result.note };
      return validateGeneratedBrief(result.generated, result.usage, "groq", result.model, [
        ...attempts,
        successfulAttempt
      ]);
    } catch (error) {
      if (!(error instanceof AiBriefError)) {
        attempts.push({ model, ok: false, note: "Unexpected AI parser failure." });
        continue;
      }

      if (error.message.includes("not configured")) {
        throw error;
      }

      attempts.push({
        model,
        ok: false,
        note: [error.message, ...(error.issues || []).slice(0, 1)].join(" ")
      });
    }
  }

  throw new AiBriefError(
    "Groq could not generate a valid brief with any configured model.",
    502,
    attempts.map((attempt) => `${attempt.model}: ${attempt.note}`)
  );
}
