# Working checkpoint

## 2026-07-10 - AI batch queue + Groq fallback stable

This is the latest known working version before the optimisation / cleanup pass.

Confirmed working:

- AI import supports multiple detected campaigns via a review queue.
- Saved queued campaigns move to the next pending campaign.
- Edits are retained while switching between queued campaigns.
- Groq first tries JSON mode, then retries without Groq-enforced JSON mode if Groq returns a 400 JSON validation / `failed_generation` error.
- `pnpm run typecheck` passes.
- `pnpm run build` passes.

Checkpoint archive:

- `jdw-working-checkpoint-2026-07-10-ai-queue-groq-fallback.zip`
