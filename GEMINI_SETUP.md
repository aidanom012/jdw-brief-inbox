# Gemini Setup

Gemini is no longer the primary parser in this build.

The app now uses Groq through `/api/ai/brief` because the previous Gemini path repeatedly returned cut-off or invalid JSON for batch campaign briefs.

Use `GROQ_SETUP.md` for the active setup.
