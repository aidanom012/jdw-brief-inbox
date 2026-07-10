# Build Notes

## Gemini JSON hardening patch

- Default Gemini model remains `gemini-3.5-flash`.
- The parser still supports single-campaign and multi-campaign output:
  - Single: `JDW_CAMPAIGN_BRIEF_V1`
  - Batch: `JDW_CAMPAIGN_BRIEF_BATCH_V1` with a `briefs` array
- The `/new` UI still shows multiple generated briefs as selectable buttons when Gemini returns a batch.
- Hardened `lib/gemini-brief.ts` so Gemini responses are parsed more safely when the model returns:
  - JSON inside markdown code fences
  - valid JSON with text before/after it
  - a raw array of briefs instead of a batch wrapper
  - a `{ briefs: [...] }` object missing the batch version field
- Strengthened the prompt so Gemini is told to return valid JSON only, with no markdown/prose.
- `npm run typecheck` passed.
- `npm run build` passed.

## Important

The app still does not auto-save Gemini output. The user reviews/edits the generated brief before clicking the normal save button.
