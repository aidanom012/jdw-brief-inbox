# JDW Brief Builder - Manual/AI Platform Wizard

Latest rebuild: `/new` now starts with two clear paths: **Manual Build** and **AI Import**. Both routes enter the same platform-aware walkthrough for Meta/TikTok campaign setup. AI import only pre-fills a draft; the user still steps through every setting before saving.

# JDW Brief Inbox

Private Next.js app for turning messy JDW / James Walker campaign notes into structured campaign briefs, ad sets, ads, validation state, and build checklists.

## AI brief parser

The `/new` page keeps the manual builder as the primary workflow. The **James Talk Import** AI helper sits below the manual section.

This build uses **Groq** as the primary AI provider:

```env
AI_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
GROQ_MAX_COMPLETION_TOKENS=2048
```

The frontend sends only the pasted raw brief to `/api/ai/brief`. The backend calls Groq server-side using Groq JSON mode. Groq returns a compact extraction object, and the backend expands it locally into the full `JDW_CAMPAIGN_BRIEF_V1` or `JDW_CAMPAIGN_BRIEF_BATCH_V1` shape.

The old `/api/gemini/brief` route remains only as a compatibility wrapper to `/api/ai/brief` so older UI calls do not break during deploys.

No AI output is saved automatically. The generated brief is loaded into the builder for review/editing first.

## Setup

Create a Supabase project and run the migration in `supabase/migrations` if present.

Add environment variables:

```env
AIDAN_PASSCODE=
JAMES_PASSCODE=
NEXT_PUBLIC_APP_NAME=JDW Brief Inbox
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=
AI_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
GROQ_MAX_COMPLETION_TOKENS=2048
```

Install and run:

```bash
npm install
npm run dev
```

Build checks:

```bash
npm run typecheck
npm run build
```

## Routes

- `/login`: private passcode login.
- `/inbox`: brief inbox.
- `/new`: manual builder plus Groq AI helper below it.
- `/brief/[id]`: structured brief, missing fields, naming, checklist, notes, and raw JSON.

## Important

Never expose AI API keys in frontend code. Do not use `NEXT_PUBLIC_GROQ_API_KEY`.
