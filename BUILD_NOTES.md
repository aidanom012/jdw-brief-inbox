# JDW Soft Finder Desktop Style

Style rethink pass:
- calmer graphite background instead of harsh mono grid
- warm paper windows with subtle tactile texture
- clean Finder-like folder icons with no clipping
- softer spacing and larger desktop/folder breathing room
- neutral beige hover state instead of loud colour scheme
- kept the existing swipe builder, delete, autosave, duplicate, export, folder workflow and login changes

No Supabase changes required.

## 2026-07-10 Gemini model fix
- Set the default Gemini model to `gemini-3.5-flash`.
- Removed the confusing `gemini-3.1-flash-lite` default from docs and code.
- Removed the `GEMINI_ALLOW_HIGHER_COST_MODELS` gate because `gemini-3.5-flash` is now the intentional primary model.
- Kept the denylist for unavailable older model IDs such as `gemini-2.5-flash` and Gemini 2.0 model IDs.
- Kept 503 retry handling. Temporary overload errors retry briefly, then return a clear message instead of failing silently.

Use these env vars locally and in Vercel:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash
GEMINI_MAX_OUTPUT_TOKENS=4096
GEMINI_FALLBACK_MODELS=
```
