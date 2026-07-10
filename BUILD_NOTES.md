# Groq JSON object rebuild

This build replaces the Gemini parser path with a Groq-first AI parser.

## Main changes

- Added `lib/ai-brief.ts`.
- Added `/api/ai/brief`.
- Kept `/api/gemini/brief` as a compatibility wrapper to `/api/ai/brief`.
- Frontend now posts to `/api/ai/brief`.
- UI wording now says Groq/AI instead of Gemini.
- Manual builder remains primary and the AI helper stays below the manual input section.

## Provider/config

Use these environment variables:

```env
AI_PROVIDER=groq
GROQ_API_KEY=your_key_here
GROQ_MODEL=openai/gpt-oss-20b
GROQ_MAX_COMPLETION_TOKENS=2048
```

Do not use `NEXT_PUBLIC_GROQ_API_KEY`.

## Backend behaviour

- One AI call per click.
- No AI repair calls.
- Uses Groq's OpenAI-compatible Chat Completions endpoint.
- Uses Groq JSON mode with `response_format.type = "json_object"`.
- Asks Groq for a compact extraction object only.
- Backend expands compact output into `JDW_CAMPAIGN_BRIEF_V1` or `JDW_CAMPAIGN_BRIEF_BATCH_V1` locally.
- Multiple briefs are still supported in one request.
- Local regex extraction pre-detects ACID, ASID, URLs, boost codes, and budget hints before the model call.

## Testing

- `npm run typecheck` passed.
- `npm run build` compiled and generated pages successfully.


## Emergency JSON mode fix

A Groq 400 `Failed to validate JSON` / `failed_generation` error means strict schema validation failed at Groq before the app received usable content. This build defaults to `` to avoid that failure path. The model now returns compact valid JSON and TypeScript expands/validates it locally.


## 2026-07-10 Emergency cleanup

- Removed the large /new top explainer/manual section.
- Moved Back / Skip / Next controls above the AI helper so they belong to the manual builder flow.
- Forced Groq JSON-object mode in code; old `GROQ_RESPONSE_FORMAT=json_schema` values are ignored.
- Added final contrast overrides for funnel cards, dark selected cards, AI textarea, and form fields.
- Kept Groq compact-output flow and no repair calls.
