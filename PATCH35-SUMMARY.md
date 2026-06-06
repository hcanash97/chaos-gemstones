# Patch35 Summary

Built from the current `/Users/hamishnash/Documents/GitHub/chaos-gemstones` repo state, including patch34.

## Analysis

The customiser save path had two confusing behaviours:

- Uploaded theme images only updated the local form state. They were not persisted until `Save changes` was clicked.
- Manual saves wrote to `site_configurations`, but the public header/banner reads from the React Query cache key `["site-theme"]`. The save function did not update or invalidate that cache, so saved changes could appear not to apply until a reload/cache refresh.

This explains why a logo could appear in the admin preview but not immediately appear in the public banner.

## Fixes

- Added a shared `persistTheme()` save helper inside the admin Theme panel.
- Manual `Save changes` now:
  - normalizes the full theme payload
  - saves it to Supabase
  - updates the local form state
  - updates React Query cache for `["site-theme"]`
  - invalidates/refetches the same cache key
  - shows `Theme settings saved and applied`
- Theme image uploads now auto-save after upload:
  - logo image
  - hero background image
  - social sharing image
- Upload success messages now say `uploaded and applied`.
- Added helper copy beside upload fields explaining that uploads auto-save, while pasted/manual URL edits still need `Save changes`.

## Files Changed

- `src/routes/admin.tsx`

## Database

- No new migration needed.

## Verification

- Ran `git diff --check` successfully.
- Could not run `npm run build` in this Codex environment because `npm` is not installed here. Run the build in the real repo after applying.
