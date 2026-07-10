# JDW Brief Builder

Soft Finder Desktop style pass for the JDW swipe/funnel brief builder.

## Gemini Brief Parser

The `/new` flow is now an AI-assisted build studio. Paste messy James-style messages into **James Talk Import**, generate structured JSON, answer the missing-info prompts, then review and edit the populated builder before saving.

The Gemini API key is server-only. Set these locally and in Vercel:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
```

The frontend calls `/api/gemini/brief` with only the pasted raw brief. The backend calls Gemini with structured JSON output, validates the result against the existing JDW schema, and returns validated campaign data. No Supabase data, saved briefs, or unrelated user data are sent to Gemini.

See `GEMINI_SETUP.md` for setup and key-rotation notes.

## Local Login

Set one of these in `.env.local` for the private passcode:

```env
APP_PASSCODE=your_private_passcode
```

If no passcode env var is configured, local development only accepts `local-jdw`. Production never uses this fallback.
