# JDW Brief Builder 8-bit rethink

Built changes:

- Reworked `/new` into a 3-step manual brief builder.
- Step 1: Campaign setup fields: artist, release, platform, account, ACID, ASID, objective, campaign type, conversion location, optimisation event, pixel, budget, dates, territory, notes.
- Step 2: Ad sets and ads with ads visually nested underneath their parent ad set.
- Step 3: review, missing fields, status preview, and build checklist preview.
- Claude JSON import is still available, but optional.
- Removed role behaviour in practice: one passcode gives full access to all actions.
- Existing `AIDAN_PASSCODE` / `JAMES_PASSCODE` still work as fallback, but `JDW_PASSCODE` is now the clean env var.
- Added 8-bit / cyber command-centre styling, animated cards, neon buttons, pixel grid background.
- Extended schema to support `campaign.campaign_notes`, `ad_sets[].notes`, and nested `ad_sets[].ads`.
- Brief detail page now displays nested ads underneath each ad set.
- Hold / approval briefs default to Needs James when complete.

Tested:

- `npm run typecheck` passes.
- `NEXT_TELEMETRY_DISABLED=1 npm run build` completes successfully.

Important:

- Do not upload `.env.local` to GitHub. Use Vercel environment variables instead.
