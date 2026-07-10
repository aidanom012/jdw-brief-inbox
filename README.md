# JDW Brief Builder

Soft Finder Desktop style pass for the JDW swipe/funnel brief builder.

## Gemini Brief Parser

The `/new` flow is now an AI-assisted build studio. Use the manual builder as the main flow. The **James Talk Import** Gemini helper now sits below the manual section; paste messy James-style messages there only when you want AI to structure the brief before review/save.

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



## Gemini brief parser

The `/new` page includes a Gemini parser for pasting messy James-style notes into the brief builder. The API key is server-only and read from `GEMINI_API_KEY`; never expose it with `NEXT_PUBLIC_`.

Current backend flow:

1. Frontend sends only the raw pasted brief to `app/api/gemini/brief/route.ts`.
2. Gemini is instructed to return a compact extraction object with `briefs[]`. The backend can also accept the older full JDW brief shape if Gemini returns it anyway.
3. `lib/gemini-brief.ts` converts compact output into the full app schema locally, or validates a complete JDW brief/batch directly.
4. Existing Zod validation/checklist logic validates the generated brief.
5. The UI loads the brief for review; it does not auto-save.

This supports multiple campaign setups in one paste. Multiple generated briefs appear as selectable buttons in the UI.

Environment variables:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash
GEMINI_MAX_OUTPUT_TOKENS=4096
GEMINI_FALLBACK_MODELS=
```

Leave `GEMINI_FALLBACK_MODELS` blank for normal use. Invalid JSON/validation errors do not trigger another model call. Cut-off JSON is reported clearly so tokens are not wasted on repair attempts.
