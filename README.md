# JDW Brief Builder

Private Next.js campaign brief builder for JDW campaign builds.

The app now uses one passcode login only. Once authenticated, the user has full access to all pages and actions.

## Main flow

- `/login`: one private passcode.
- `/inbox`: campaign brief inbox with status filters.
- `/new`: three-step brief builder:
  1. Campaign setup.
  2. Ad sets with nested ads underneath each parent ad set.
  3. Review, missing info, and build checklist preview.
- `/brief/[id]`: structured build view, missing fields, naming suggestions, checklist, internal notes, and raw JSON.

Claude JSON import still exists, but it is optional. The form builder is the main source of truth.

## Setup

1. Create a Supabase project and run `supabase/migrations/202607090001_create_briefs.sql`.
2. Add environment variables:

```env
JDW_PASSCODE=
NEXT_PUBLIC_APP_NAME=JDW Brief Builder
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=
```

Existing `AIDAN_PASSCODE` and `JAMES_PASSCODE` still work as fallback passcodes if you already configured them in Vercel.

3. Install and run:

```bash
pnpm install
pnpm dev
```

The app does not infer missing campaign details. Blank fields stay blank and appear in the missing info list.
