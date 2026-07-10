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

## 2026-07-10 production console + model ladder pass

Checkpoint before this work:

- `jdw-working-checkpoint-2026-07-10-ai-queue-groq-fallback.zip`

### Behaviour

- Groq now uses a model fallback chain: `openai/gpt-oss-120b`, `qwen/qwen3-32b`, then `openai/gpt-oss-20b`.
- Each model still gets a JSON-mode attempt plus a non-JSON-mode retry if Groq rejects JSON generation.
- The AI import panel shows the model ladder and the model that actually succeeded.
- Builder layout now uses a production workbench structure:
  - left rail for campaign queue, step navigation, and batch actions
  - main panel for the active question
  - right rail for confidence, smart templates, missing-info prompts, captured evidence, and live funnel preview
  - sticky bottom dock for Back, Skip, Next, and Save
- Campaign queue now supports skipping a campaign, duplicating the previous campaign into the current one, and saving all complete queued campaigns.
- Keyboard navigation supports alt-left, alt-right, and command/control-enter outside form fields.
- Live funnel preview is lazy-loaded to reduce first builder load.
- Smart templates added for Meta streaming, Meta views, and TikTok Spark.

### Guide data folded in

- Meta guide:
  - Campaign -> Ad Set -> Ad level structure
  - objective-to-funnel guidance
  - Pixel/CAPI requirement for conversion objectives
  - automatic placements as the efficiency default
  - interest/custom/lookalike audience guidance
  - creative fatigue and CTA/creative fit checks
- TikTok guide:
  - Campaign -> Ad Group -> Ad level structure
  - ad group uniqueness
  - Website/App promotion type
  - automatic placement recommendation
  - placements cannot be changed after ad group creation
  - targeting categories, ACO, budget/schedule, bidding and optimization goals
  - Spark vs non-Spark identity and ad format checks

### Files changed

- `app/api/ai/brief/route.ts`
- `app/globals.css`
- `components/AiBriefPanel.tsx`
- `components/NewBriefForm.tsx`
- `.env.example`
- `GROQ_SETUP.md`
- `README.md`
