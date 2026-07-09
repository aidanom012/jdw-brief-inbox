# JDW Brief Builder pixel-simple rethink

Built changes:

- Simplified the builder so it is much less overwhelming.
- One passcode login only, full access once authenticated.
- Removed ASID from the visible UI. The app only asks for ACID.
- Step 1 keeps useful campaign-level details but arranged as the known setup only.
- Step 2 is now simple: set how many ad sets, write what each ad set does/targets, optionally tick ad set budget, then add ads underneath.
- Ads only ask for ad/asset name, asset type, destination link, asset links/post URLs/boost codes, copy, and a tiny note.
- Kept optional Claude JSON import.
- Reworked the look toward a proper 8-bit menu/window style: cream/yellow pixel panels, black chunky borders, square UI, pixel shadows, scanlines/grid, and snappier transitions.
- Existing Supabase structure still works; data is saved inside raw_json.

Manual apply:

Use the copy-into-repo zip. Drag the contents of `files/` into your repo and choose Replace/Merge.

Vercel env:

JDW_PASSCODE=your-one-passcode

Keep your Supabase env vars as they are.
