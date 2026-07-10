import "server-only";

import {
  validateBriefJson,
  type BriefValidationResult,
  type JDWCampaignBrief
} from "@/lib/brief-schema";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
const MAX_OUTPUT_TOKENS = 8192;
export const MAX_RAW_GEMINI_BRIEF_LENGTH = 50_000;

type GeminiApiResponse = {
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

function extractGeminiText(response: GeminiApiResponse): string {
  const text = response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new GeminiBriefError("Gemini did not return any JSON.", 502);
  }

  return text;
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

export async function generateGeminiBrief(rawBrief: string): Promise<GeminiBriefResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiBriefError("Gemini is not configured for this app yet.", 500);
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
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
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: "application/json"
      }
    })
  });

  let geminiJson: GeminiApiResponse;
  try {
    geminiJson = (await response.json()) as GeminiApiResponse;
  } catch {
    throw new GeminiBriefError("Gemini returned an unreadable response.", 502);
  }

  if (!response.ok) {
    throw new GeminiBriefError(
      geminiJson.error?.message ? "Gemini could not generate this brief." : "Gemini request failed.",
      502
    );
  }

  const generated = parseJsonOnly(extractGeminiText(geminiJson));
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
