# Patch31 Summary

Built from the current `/Users/hamishnash/Documents/GitHub/chaos-gemstones` repo state, including the latest external/GitHub-applied changes.

## Customiser: global brand and contact controls

- Added editable `site_name` support to the site theme settings.
- Updated the public header, mobile drawer, footer, and shared `Logo` component so the customiser can control the brand text.
- Added editable homepage hero CTA controls:
  - primary button label
  - primary button URL
  - secondary button label
  - secondary button URL
- Added editable global contact/social fields:
  - contact email
  - Instagram URL or handle
  - footer tagline
  - footer bottom notice
- Made Instagram forgiving so `@chaosgemstonemarket`, `chaosgemstonemarket`, and a full Instagram URL all work.

## Visual polish

- Updated homepage accent-colour button text to use the computed readable foreground colour.
- Updated the admin live preview so unsaved accent colour changes still choose readable preview text.
- Updated the admin customiser preview to show the edited site name and edited primary CTA label.

## Database

- Added migration `20260606133000_global_theme_fields.sql`.
- The migration backfills the new JSON theme keys into active `site_configurations` rows without adding new table columns.

## Verification

- Ran `git diff --check` successfully.
- Could not run `npm run build` in this extracted Codex environment because `npm` is not available here. Run the build in the real repo after applying.
