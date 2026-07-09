# JDW Brief Builder

Private one-login campaign brief builder for JDW campaign builds.

## Flow

1. Campaign setup: known details like artist, platform, account, ACID, objective, pixel, budget, dates, territory, and notes.
2. Ad sets: choose how many ad sets, write simple notes for what each ad set does/targets, optionally add ad set budget, then add ads underneath.
3. Review: missing info and build checklist.

Claude JSON import is optional. The form is the main source of truth.

## Env

```env
JDW_PASSCODE=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=
```
