# Build Notes

## Token-saving Gemini backend rework

This version changes the Gemini flow from “make Gemini output the whole app object” to “make Gemini output a compact extraction object, then let the backend build the full JDW brief locally.”

### What changed

- Default Gemini model remains `gemini-3.5-flash`.
- Gemini now returns a compact shape only:
  - `briefs[]`
  - campaign fields
  - budget fields
  - ad sets
  - nested ads
  - top-level ads
  - special notes
- The backend converts that compact output into the full `JDW_CAMPAIGN_BRIEF_V1` app schema locally.
- Gemini no longer has to generate repeated boilerplate fields like `source`, `build`, `brief_version`, or `missing_required_fields`.
- Missing fields are still computed locally by the existing validation/checklist logic.
- Multiple campaign setups are still supported in one request: Gemini returns multiple items in `briefs[]`, then the backend returns `JDW_CAMPAIGN_BRIEF_BATCH_V1` when there is more than one.
- JSON schema control is now sent through `generationConfig.responseSchema` with `responseMimeType: "application/json"`.
- JSON parse failures no longer trigger another model call. The backend tries local parsing/extraction only, then errors cleanly if the response is still unusable.
- Fallback models are only attempted for model availability problems like 404 / no longer available, not for invalid JSON or validation issues.
- The API response now includes Gemini token usage when Google returns it.
- The `/new` Gemini panel shows token usage after a successful generation.

### Why this should use fewer tokens

The old approach made Gemini output the entire full app JSON object, including fields the backend can safely fill itself. That created a larger output and more chances for broken JSON.

The new approach keeps Gemini focused on extraction only. The backend handles normalisation, defaults, enum cleanup, budget number parsing, currency detection, and final Zod validation.

### Tests

- `npm run typecheck` passed.
- `npm run build` passed.

## Important

The app still does not auto-save Gemini output. The user reviews/edits the generated brief before clicking the normal save button.


## Follow-up hardening

- The Gemini panel now renders below the manual build section.
- The prompt explicitly forbids the full JDW app schema and asks only for the compact `briefs[]` extraction object.
- The parser now accepts complete `JDW_CAMPAIGN_BRIEF_V1` and `JDW_CAMPAIGN_BRIEF_BATCH_V1` responses if Gemini returns the older/full shape anyway.
- If Gemini returns JSON-looking text that is incomplete/truncated, the backend reports it as cut off instead of making another Gemini call.


## Emergency JSON hardening

- Switched primary Gemini call from legacy generateContent to Interactions API.
- Uses response_format application/json schema, store:false, and minimal thinking.
- Keeps one-call behaviour for JSON failures; no repair calls.
- Moved Gemini panel below the manual builder input area.
