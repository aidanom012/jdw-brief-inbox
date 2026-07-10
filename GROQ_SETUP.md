# Groq Setup

The brief parser uses Groq as the primary AI provider instead of Gemini.

## Local setup

Create `.env.local`:

```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL_CHAIN=openai/gpt-oss-120b,qwen/qwen3-32b,openai/gpt-oss-20b
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
GROQ_MODEL_CHAIN=openai/gpt-oss-120b,qwen/qwen3-32b,openai/gpt-oss-20b
GROQ_MAX_COMPLETION_TOKENS=2048
```

Then redeploy.

## Important production note

The backend tries the configured model chain in order. The default is `openai/gpt-oss-120b`, then `qwen/qwen3-32b`, then `openai/gpt-oss-20b`. Each model first asks Groq for JSON mode, then automatically retries without Groq-enforced JSON mode if Groq rejects its own generation with a 400 `failed_generation` / JSON validation error. The app still validates the returned JSON itself before loading anything into the builder.

## What changed

- Frontend posts to `/api/ai/brief`.
- The old `/api/gemini/brief` route remains as a compatibility wrapper.
- Backend calls Groq's OpenAI-compatible Chat Completions endpoint.
- The parser uses a model fallback chain rather than one brittle model.
- Groq returns compact JSON only.
- TypeScript expands that compact object into `JDW_CAMPAIGN_BRIEF_V1` or `JDW_CAMPAIGN_BRIEF_BATCH_V1` locally.
- The app still does not auto-save AI output. User review is required.

## Token/cost controls

- One AI call per click.
- No AI repair calls.
- The model returns compact JSON, not the full app schema.
- `GROQ_MAX_COMPLETION_TOKENS` defaults to `2048`.
- Local regex extraction pre-detects ACID, links, boost codes, and budget hints before calling Groq.
