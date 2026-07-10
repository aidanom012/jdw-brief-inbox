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

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

type JsonObject = Record<string, unknown>;
type JsonSchema = Record<string, unknown>;

export type GeneratedBriefPayload =
  | JDWCampaignBrief
  | {
      brief_version: "JDW_CAMPAIGN_BRIEF_BATCH_V1";
      briefs: JDWCampaignBrief[];
    };

export type GeminiBriefResult = {
  payload: GeneratedBriefPayload;
  validation: Extract<BriefValidationResult, { ok: true }>;
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

const GEMINI_BRIEF_PROMPT = `You convert messy JDW / James Walker paid social campaign briefs into strict JSON for a private campaign brief builder.

Return JSON only. Do not include markdown, comments, or explanations.
Do not guess missing fields. If a field is not clearly present, use null, "unknown", or [] as appropriate.
Preserve exact details from the brief, including budgets, dates, links, ACID, ASID, pixel, optimisation event, account, platform, territory, targeting, ad copy, post URLs, boost codes, and asset links.
Do not invent targeting, dates, budgets, pixels, campaign names, copy, or links.

If the pasted text contains one campaign, return one JDW_CAMPAIGN_BRIEF_V1 object.
If it contains multiple distinct campaign setups, return a JDW_CAMPAIGN_BRIEF_BATCH_V1 object with a briefs array.

Use this exact object shape for a single campaign:
{
  "brief_version": "JDW_CAMPAIGN_BRIEF_V1",
  "source": {
    "source_type": "quick_note",
    "source_title": "Gemini raw brief parser",
    "source_date": null,
    "original_item_label": null,
    "source_notes": []
  },
  "build": {
    "action": "new_campaign",
    "existing_campaign_name": null,
    "approval_required": null,
    "launch_instruction": null,
    "priority": "normal"
  },
  "campaign": {
    "artist": null,
    "release_title": null,
    "acid": null,
    "asid": null,
    "platform": null,
    "account": null,
    "objective": null,
    "campaign_type": null,
    "conversion_location": null,
    "optimisation_event": null,
    "pixel": null,
    "territory_summary": null,
    "start_date": null,
    "end_date": null,
    "campaign_notes": null
  },
  "budget": {
    "type": null,
    "amount": null,
    "currency": null,
    "notes": null
  },
  "ad_sets": [
    {
      "label": null,
      "locations": [],
      "age_min": null,
      "age_max": null,
      "gender": "unknown",
      "placements": [],
      "targeting_type": "unknown",
      "targeting_details": null,
      "exclusions": null,
      "budget_amount": null,
      "budget_type": null,
      "notes": null,
      "ads": [
        {
          "label": null,
          "release_title": null,
          "asset_type": "unknown",
          "asset_links": [],
          "post_url": null,
          "boost_code": null,
          "destination_url": null,
          "copy": null,
          "notes": null
        }
      ]
    }
  ],
  "ads": [],
  "special_notes": [],
  "missing_required_fields": []
}

Allowed enum values:
platform: Meta, TikTok, YouTube, Other, or null
budget.type: daily, lifetime, campaign_total, ad_set_level, unknown, or null
ad set budget_type: daily, lifetime, campaign_total, unknown, or null
currency: GBP, EUR, USD, AUD, CAD, unknown, or null
gender: all, male, female, unknown, or null
targeting_type: broad, interest, lookalike, retargeting, advantage_plus, unknown, or null
asset_type: video, image, carousel, spark_ad, unknown, or null
source_type: email, handover, paid_media_brief, report, quick_note, unknown, or null
build.action: new_campaign, add_ad_set, boost_post, update_existing_campaign, budget_change, hold, report_reference, unknown, or null
build.priority: urgent, normal, hold, unknown, or null

Put ads inside their parent ad set whenever the brief says which ad belongs to which audience. If the relationship is unclear, put the ad under each relevant ad set only when the brief explicitly says so; otherwise keep it in the top-level ads array.
Use numbers for budget_amount, budget.amount, age_min, and age_max.`;

function objectSchema(properties: Record<string, JsonSchema>): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required: Object.keys(properties)
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

function nullableEnum(values: string[], description?: string): JsonSchema {
  return {
    type: ["string", "null"],
    enum: [...values, null],
    ...(description ? { description } : {})
  };
}

const adJsonSchema = objectSchema({
  label: nullableString(),
  release_title: nullableString(),
  asset_type: nullableEnum(["video", "image", "carousel", "spark_ad", "unknown"]),
  asset_links: stringArray("Asset, Drive, Dropbox, TikTok, Meta, or creative links."),
  post_url: nullableString("Existing organic post URL if supplied."),
  boost_code: nullableString("TikTok/Spark/boost code if supplied."),
  destination_url: nullableString("Landing, streaming, or click-through URL."),
  copy: nullableString("Ad copy exactly as supplied."),
  notes: nullableString()
});

const adSetJsonSchema = objectSchema({
  label: nullableString(),
  locations: stringArray("Audience locations or territory details."),
  age_min: nullableNumber(),
  age_max: nullableNumber(),
  gender: nullableEnum(["all", "male", "female", "unknown"]),
  placements: stringArray(),
  targeting_type: nullableEnum([
    "broad",
    "interest",
    "lookalike",
    "retargeting",
    "advantage_plus",
    "unknown"
  ]),
  targeting_details: nullableString(),
  exclusions: nullableString(),
  budget_amount: nullableNumber(),
  budget_type: nullableEnum(["daily", "lifetime", "campaign_total", "unknown"]),
  notes: nullableString(),
  ads: {
    type: "array",
    items: adJsonSchema
  }
});

const singleBriefJsonSchema = objectSchema({
  brief_version: {
    type: "string",
    enum: ["JDW_CAMPAIGN_BRIEF_V1"]
  },
  source: objectSchema({
    source_type: nullableEnum([
      "email",
      "handover",
      "paid_media_brief",
      "report",
      "quick_note",
      "unknown"
    ]),
    source_title: nullableString(),
    source_date: nullableString(),
    original_item_label: nullableString(),
    source_notes: stringArray()
  }),
  build: objectSchema({
    action: nullableEnum([
      "new_campaign",
      "add_ad_set",
      "boost_post",
      "update_existing_campaign",
      "budget_change",
      "hold",
      "report_reference",
      "unknown"
    ]),
    existing_campaign_name: nullableString(),
    approval_required: {
      type: ["boolean", "null"]
    },
    launch_instruction: nullableString(),
    priority: nullableEnum(["urgent", "normal", "hold", "unknown"])
  }),
  campaign: objectSchema({
    artist: nullableString(),
    release_title: nullableString(),
    acid: nullableString(),
    asid: nullableString(),
    platform: nullableEnum(["Meta", "TikTok", "YouTube", "Other"]),
    account: nullableString(),
    objective: nullableString(),
    campaign_type: nullableString(),
    conversion_location: nullableString(),
    optimisation_event: nullableString(),
    pixel: nullableString(),
    territory_summary: nullableString(),
    start_date: nullableString(),
    end_date: nullableString(),
    campaign_notes: nullableString()
  }),
  budget: objectSchema({
    type: nullableEnum(["daily", "lifetime", "campaign_total", "ad_set_level", "unknown"]),
    amount: nullableNumber(),
    currency: nullableEnum(["GBP", "EUR", "USD", "AUD", "CAD", "unknown"]),
    notes: nullableString()
  }),
  ad_sets: {
    type: "array",
    items: adSetJsonSchema
  },
  ads: {
    type: "array",
    items: adJsonSchema
  },
  special_notes: stringArray(),
  missing_required_fields: stringArray()
});

const briefResponseJsonSchema = {
  anyOf: [
    singleBriefJsonSchema,
    objectSchema({
      brief_version: {
        type: "string",
        enum: ["JDW_CAMPAIGN_BRIEF_BATCH_V1"]
      },
      briefs: {
        type: "array",
        items: singleBriefJsonSchema
      }
    })
  ]
};

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

function collectLikelyJsonStrings(value: unknown, depth = 0): string[] {
  if (depth > 6) {
    return [];
  }

  if (typeof value === "string") {
    return value.includes("JDW_CAMPAIGN_BRIEF") ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectLikelyJsonStrings(item, depth + 1));
  }

  if (!isJsonObject(value)) {
    return [];
  }

  return Object.values(value).flatMap((item) => collectLikelyJsonStrings(item, depth + 1));
}

function extractGeneratedJsonText(response: unknown): string {
  if (isGeneratedBriefObject(response)) {
    return JSON.stringify(response);
  }

  if (isJsonObject(response)) {
    const outputText = response.output_text || response.outputText;
    if (typeof outputText === "string" && outputText.trim().length > 0) {
      return outputText.trim();
    }
  }

  const [jsonText] = collectLikelyJsonStrings(response);
  if (jsonText) {
    return jsonText.trim();
  }

  throw new GeminiBriefError("Gemini did not return any JSON.", 502);
}

function parseJsonOnly(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const firstObject = cleaned.indexOf("{");
      const lastObject = cleaned.lastIndexOf("}");
      if (firstObject >= 0 && lastObject > firstObject) {
        try {
          return JSON.parse(cleaned.slice(firstObject, lastObject + 1));
        } catch {
          throw new GeminiBriefError("Gemini returned text that was not valid JSON.", 502);
        }
      }

      throw new GeminiBriefError("Gemini returned text that was not valid JSON.", 502);
    }
  }
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
  const models = [
    process.env.GEMINI_MODEL,
    DEFAULT_GEMINI_MODEL,
    ...splitConfiguredFallbackModels()
  ]
    .filter((model): model is string => Boolean(model))
    .map(normaliseModelName)
    .filter((model) => !UNAVAILABLE_GEMINI_MODELS.has(model));

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

async function generateWithGenerateContentApi(
  apiKey: string,
  model: string,
  rawBrief: string
): Promise<unknown> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${GEMINI_BRIEF_PROMPT}\n\nRaw brief:\n${rawBrief}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.8,
      candidateCount: 1,
      maxOutputTokens: configuredMaxOutputTokens(),
      responseMimeType: "application/json"
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

  return parseJsonOnly(extractGenerateContentText(payload as GeminiGenerateContentResponse));
}

function validateGeneratedBrief(generated: unknown): GeminiBriefResult {
  const rawGeneratedJson = JSON.stringify(generated);
  const validation = validateBriefJson(rawGeneratedJson);

  if (!validation.ok) {
    throw new GeminiBriefError(
      validation.message,
      422,
      validationIssues(validation)
    );
  }

  return {
    payload: briefPayloadFromValidation(validation),
    validation
  };
}

export async function generateGeminiBrief(rawBrief: string): Promise<GeminiBriefResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiBriefError("Gemini is not configured for this app yet.", 500);
  }

  let lastError: GeminiBriefError | null = null;

  for (const model of configuredModels()) {
    try {
      return validateGeneratedBrief(await generateWithGenerateContentApi(apiKey, model, rawBrief));
    } catch (error) {
      if (!(error instanceof GeminiBriefError)) {
        throw error;
      }

      lastError = error;
      if (isCredentialOrQuotaError(error)) {
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
