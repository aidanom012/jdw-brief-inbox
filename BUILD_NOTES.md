# Build notes — contrast + motion polish

- Functionally based on the swipe desktop/delete/completed version.
- Changed palette to black background, white UI panels, and #EB5160 salmon-pink accent.
- Replaced the green completed state with a pink crossed-out completed state to keep the palette consistent.
- Added page/folder/panel entrance animations and smoother hover transitions.
- No Supabase migration required.

Validation run in sandbox:
- `npm run typecheck` passed.
- `next build` compiled successfully and passed type/lint checks, then hit an EPIPE during Next's final page-data worker step in the sandbox.
