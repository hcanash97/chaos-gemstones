# Patch37 Summary

Built from the current `/Users/hamishnash/Documents/GitHub/chaos-gemstones` repo state, including patch36.

## Theme Presets

- Added a new `Presets` tab to the admin Theme customiser.
- The Theme customiser now opens on `Presets` by default.
- Added four curated landing-page directions:
  - `Trade Classic`
  - `Luxury Editorial`
  - `Dark Cinema`
  - `Clean Retail`
- Each preset adjusts a bundled set of existing theme fields, including:
  - accent colour
  - glow colour
  - animation preset
  - parallax setting
  - hero media type
  - overlay strength
  - ticker visibility/speed
  - shape grid visibility/mode
  - hero badge and CTA labels/routes

## Safe Publishing Behaviour

- Applying a preset only updates the editor draft.
- Presets do not publish until `Save changes` is clicked.
- The live preview now shows a `Draft preview` badge when current settings differ from the saved theme.

## Files Changed

- `src/routes/admin.tsx`

## Database

- No new migration needed.

## Verification

- Ran `git diff --check` successfully.
- Could not run `npm run build` in this Codex environment because `npm` is not installed here. Run the build in the real repo after applying.
