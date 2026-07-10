# Gemini Setup

1. Create a Gemini API key in Google AI Studio.
2. Add it to `.env.local` locally:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash
GEMINI_MAX_OUTPUT_TOKENS=4096
```

3. Add the same variables in Vercel:

```text
Project -> Settings -> Environment Variables
```

4. Redeploy after adding the variables.
5. Never put the key in frontend code. Do not use `NEXT_PUBLIC_GEMINI_API_KEY`.
6. If a key has been pasted into chat or committed anywhere, delete and regenerate it.

The app calls Gemini only from `app/api/gemini/brief/route.ts`, asks for structured JSON, validates the generated JSON against the JDW schema, and loads it into the brief builder for review. It does not save Gemini output until the user clicks the normal save button.

Use `GEMINI_MODEL=gemini-3.5-flash`. Only raise `GEMINI_MAX_OUTPUT_TOKENS` if large batch briefs are being cut off.

## 503 / high demand errors

A 503 response means Gemini is temporarily overloaded or out of capacity. It is not the same as a bad key or a validation failure. The app retries short temporary 503 failures automatically, then shows a clear retry message if Gemini is still overloaded.

Optional fallback models can be supplied as a comma-separated list, but keep this blank for normal use:

```env
GEMINI_FALLBACK_MODELS=
```

## Token-saving backend behaviour

The Gemini route is designed to call Gemini once per click. It asks for a compact extraction object, not the full app JSON. The backend then expands the compact extraction into the full `JDW_CAMPAIGN_BRIEF_V1` or `JDW_CAMPAIGN_BRIEF_BATCH_V1` shape locally.

This keeps output tokens down and reduces invalid JSON issues because Gemini no longer has to generate boilerplate fields that the app can create itself.

The route sends a compact response schema to Gemini using `responseMimeType: "application/json"` and `responseSchema`. The parser also accepts the older full `JDW_CAMPAIGN_BRIEF_V1` / `JDW_CAMPAIGN_BRIEF_BATCH_V1` shape if Gemini ignores the compact instruction.

If Gemini still returns malformed text, the backend tries local JSON extraction only. It does not spend another Gemini request trying to repair the same output.


## July parser hardening

The AI panel now sits below the manual build section. The backend accepts both compact extraction JSON and complete JDW brief JSON, so older/full outputs do not fail just because they are not compact. If Gemini output is cut off by max tokens, the app shows that as a cut-off response instead of spending another Gemini request.


## July 2026 hardening

The backend now uses the Gemini Interactions API first with `response_format` JSON schema and `store: false`. The older generateContent route is only retained as a model-availability fallback. The AI panel is rendered below the manual builder inputs.
