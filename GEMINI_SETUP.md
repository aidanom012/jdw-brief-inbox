# Gemini Setup

1. Create a Gemini API key in Google AI Studio.
2. Add it to `.env.local` locally:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
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


For the lowest-cost setup, keep `GEMINI_MODEL=gemini-3.1-flash-lite`. Only raise `GEMINI_MAX_OUTPUT_TOKENS` if large batch briefs are being cut off.
