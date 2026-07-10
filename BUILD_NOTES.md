# Build Notes - Platform-aware manual/AI wizard rebuild

## What changed

- Rebuilt `/new` so the user chooses either **Manual Build** or **AI Import** first.
- Removed the old top explainer / “Clear path from chat to campaign” manual card.
- AI Import is now its own clear starting section, not mixed into the manual wizard.
- Manual Build and AI Import both feed into the same step-by-step campaign walkthrough.
- After Groq import, the builder now starts from step 1 so the user reviews every setting like a manual build instead of being dropped straight into final review.
- Back / Skip / Next / Save controls are now inside the wizard header section, above the step body, not underneath the AI box.
- Added platform-aware guidance based on the uploaded Meta and TikTok walkthroughs:
  - Meta: Campaign → Ad Set → Ad
  - TikTok: Campaign → Ad Group → Ad
- TikTok mode now labels ad set screens as **Ad groups** in the walkthrough UI while still saving to the existing JDW schema internally.
- Added stronger high-contrast CSS overrides for inputs, textareas, selected cards, missing-info prompts, AI panel, and wizard sections.

## AI behaviour

- Groq remains the primary parser through `/api/ai/brief`.
- `GROQ_RESPONSE_FORMAT` is still ignored by the backend; the code forces safer JSON-object mode.
- AI output is only used as a draft prefill.
- Nothing auto-saves after AI import.
- Multiple brief selection still exists inside the AI panel.

## Required Vercel env vars

```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=openai/gpt-oss-20b
GROQ_MAX_COMPLETION_TOKENS=2048
```

Do not add `GROQ_RESPONSE_FORMAT=json_schema`.

## Checks run

```bash
npm run typecheck
npm run build
```

Both passed.
