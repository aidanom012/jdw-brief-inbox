# JDW Soft Finder Desktop Style

Style rethink pass:
- calmer graphite background instead of harsh mono grid
- warm paper windows with subtle tactile texture
- clean Finder-like folder icons with no clipping
- softer spacing and larger desktop/folder breathing room
- neutral beige hover state instead of loud colour scheme
- kept the existing swipe builder, delete, autosave, duplicate, export, folder workflow and login changes

No Supabase changes required.

## 2026-07-10 Gemini model availability fix
- Updated the default low-cost model from `gemini-2.5-flash-lite` to `gemini-3.1-flash-lite`.
- Removed `gemini-2.5-flash` from fallback models because new users can receive 404 model-unavailable errors.
- Added a small denylist so an old `GEMINI_MODEL=gemini-2.5-flash` env var will be ignored instead of breaking the parser.
