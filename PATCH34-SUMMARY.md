# Patch34 Summary

Built from the current `/Users/hamishnash/Documents/GitHub/chaos-gemstones` repo state, including patch33.

## Admin customiser usability

- Reworked the Theme customiser from one long scrolling form into a tabbed editor.
- Added editor tabs:
  - Brand
  - Hero
  - SEO
  - Modules
  - Layout
  - Copy
  - Preview
- Added a small description panel under the tabs so each area explains what it controls.
- Preserved the existing save/reset/upload logic.
- Kept the tab list horizontally scrollable for mobile dashboard use.

## Preview improvements

- The Preview tab now expands the live preview column across the desktop layout.
- The admin preview now supports hero background video as well as hero background image.
- Preview overlay opacity now applies when either image or video media is configured.

## Scope

- No new Supabase migration was needed for this patch.
- This patch is mostly a dashboard/user-experience improvement on top of the existing customiser fields.

## Verification

- Ran `git diff --check` successfully.
- Could not run `npm run build` in this Codex environment because `npm` is not installed here. Run the build in the real repo after applying.
