# JDW Brief Builder

Soft Finder Desktop style pass for the JDW swipe/funnel brief builder.

## Gemini Brief Parser

The `/new` flow is now an AI-assisted build studio. Paste messy James-style messages into **James Talk Import**, generate structured JSON, answer the missing-info prompts, then review and edit the populated builder before saving.

The Gemini API key is server-only. Set these locally and in Vercel:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
GEMINI_MAX_OUTPUT_TOKENS=4096
```

The frontend calls `/api/gemini/brief` with only the pasted raw brief. The backend calls Gemini with structured JSON output, validates the result against the existing JDW schema, and returns validated campaign data. No Supabase data, saved briefs, or unrelated user data are sent to Gemini.

A 503 response means Gemini is temporarily overloaded or out of capacity. The app retries short temporary 503 failures automatically, then shows a clear retry message if Gemini is still overloaded.

Optional fallback models can be supplied as a comma-separated list, but keep this blank for normal use:

```env
GEMINI_FALLBACK_MODELS=
```

See `GEMINI_SETUP.md` for setup and key-rotation notes.

## Local Login

Set one of these in `.env.local` for the private passcode:

```env
APP_PASSCODE=your_private_passcode
```

If no passcode env var is configured, local development only accepts `local-jdw`. Production never uses this fallback.
## 503 / high demand errors

A 503 response means Gemini is temporarily overloaded or out of capacity. It is not the same as a bad key or a validation failure. The app now retries short temporary 503 failures automatically, then shows a clear retry message if Gemini is still overloaded.

Optional fallback models can be supplied as a comma-separated list, but keep this blank for normal low-cost use:

```env
GEMINI_FALLBACK_MODELS=
```

