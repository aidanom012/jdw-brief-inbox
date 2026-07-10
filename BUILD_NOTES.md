# Build notes

## 2026-07-10 AI batch queue upgrade

Changed AI multi-brief imports so generated briefs are no longer lost after selecting one.

### Behaviour

- AI import can return multiple campaigns in one response.
- The app now creates an AI campaign queue when multiple briefs are detected.
- The first campaign is loaded into the same manual walkthrough from step 1.
- A queue menu appears at the top of the builder with each imported campaign.
- Users can switch between pending campaigns mid-build.
- Current edits are kept in the queue when switching.
- Saving one campaign marks it saved and moves to the next pending campaign.
- After the final queued campaign is saved, the user is sent back to the inbox.
- Single-campaign AI import still behaves the same as before.

### Files changed

- `components/AiBriefPanel.tsx`
- `components/NewBriefForm.tsx`
- `app/globals.css`

### Tests

- `npm run typecheck` passed.
- `npm run build` passed.
