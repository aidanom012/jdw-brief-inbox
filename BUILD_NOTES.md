# Groq strict JSON rebuild

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
- Uses Structured Outputs with `response_format.type = "json_schema"` and `strict: true`.
- Asks Groq for a compact extraction object only.
- Backend expands compact output into `JDW_CAMPAIGN_BRIEF_V1` or `JDW_CAMPAIGN_BRIEF_BATCH_V1` locally.
- Multiple briefs are still supported in one request.
- Local regex extraction pre-detects ACID, ASID, URLs, boost codes, and budget hints before the model call.

## Testing

- `npm run typecheck` passed.
- `npm run build` compiled and generated pages successfully.
