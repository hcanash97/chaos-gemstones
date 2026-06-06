# Patch36 Summary

Built from the current `/Users/hamishnash/Documents/GitHub/chaos-gemstones` repo state, including patch35.

## Theme customiser save confidence

- Added saved/unsaved tracking to the admin Theme customiser.
- The editor now compares the current form against the last saved theme.
- Added a visible status pill:
  - `Saved`
  - `Unsaved changes`
- Added a `Last checked` timestamp.
- Disabled the primary save button when there are no unsaved changes.
- Added warning helper text when edits are unsaved.

## Supabase verification

- Added `Reload saved theme`.
- This refetches the active `site_configurations` row from Supabase, updates the editor form, updates the shared `["site-theme"]` cache, and confirms what is actually persisted.

## Safety

- Added a browser `beforeunload` warning when leaving the page with unsaved customiser edits.
- Successful saves now update the `lastSavedTheme` baseline and timestamp.

## Files Changed

- `src/routes/admin.tsx`

## Database

- No new migration needed.

## Verification

- Ran `git diff --check` successfully.
- Could not run `npm run build` in this Codex environment because `npm` is not installed here. Run the build in the real repo after applying.
