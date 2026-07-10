# Groq Setup

The brief parser now uses Groq as the primary AI provider instead of Gemini.

## Local setup

Create `.env.local`:

```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=openai/gpt-oss-20b
GROQ_MAX_COMPLETION_TOKENS=2048
```

Do not use `NEXT_PUBLIC_GROQ_API_KEY`. The key must stay server-side.

## Vercel setup

Go to:

```text
Vercel -> Project -> Settings -> Environment Variables
```

Add:

```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=openai/gpt-oss-20b
GROQ_MAX_COMPLETION_TOKENS=2048
```

Then redeploy.

## What changed

- Frontend posts to `/api/ai/brief`.
- The old `/api/gemini/brief` route remains as a compatibility wrapper.
- Backend calls Groq's OpenAI-compatible Chat Completions endpoint.
- It uses Structured Outputs with `response_format.type = "json_schema"` and `strict: true`.
- Groq returns a compact extraction object only.
- TypeScript expands that compact object into `JDW_CAMPAIGN_BRIEF_V1` or `JDW_CAMPAIGN_BRIEF_BATCH_V1` locally.
- The app still does not auto-save AI output. User review is required.

## Token/cost controls

- One AI call per click.
- No AI repair calls.
- The model returns compact JSON, not the full app schema.
- `GROQ_MAX_COMPLETION_TOKENS` defaults to `2048`.
- Local regex extraction pre-detects ACID, ASID, links, boost codes, and budget hints before calling Groq.
