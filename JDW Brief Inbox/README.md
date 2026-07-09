# JDW Brief Inbox

Minimal private Next.js app for turning Claude-generated `JDW_CAMPAIGN_BRIEF_V1` JSON into a brief card, validation state, build checklist, and visible campaign status.

## Setup

1. Create a Supabase project and run `supabase/migrations/202607090001_create_briefs.sql`.
2. Add environment variables:

```env
AIDAN_PASSCODE=
JAMES_PASSCODE=
NEXT_PUBLIC_APP_NAME=JDW Brief Inbox
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=
```

3. Install and run:

```bash
pnpm install
pnpm dev
```

## Routes

- `/login`: private passcode login.
- `/inbox`: filtered brief inbox.
- `/new`: paste, validate, and submit Claude JSON.
- `/brief/[id]`: structured brief, missing fields, naming, checklist, notes, and raw JSON.

The app does not call AI services and does not infer missing campaign details. It only parses, validates, displays, and tracks build progress.
