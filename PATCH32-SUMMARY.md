# Patch32 Summary

Built from the current `/Users/hamishnash/Documents/GitHub/chaos-gemstones` repo state, including patch31.

## Customiser: SEO and social sharing controls

- Added editable SEO fields to the site theme model:
  - default SEO title
  - default meta description
  - social sharing image URL
- Added a new admin customiser section named `SEO & sharing`.
- Added character counts for the SEO title and description.
- Added upload support for the social sharing image using the existing `stone-images` Supabase storage bucket.
- Added a search-result style preview and a social-card style preview in the admin customiser sidebar.

## Metadata bridge

- Extended `SiteThemeBridge` so the loaded theme updates:
  - `document.title`
  - meta description
  - Open Graph site name, title, description and image
  - Twitter title, description and image
  - theme colour
- Updated root fallback metadata to read from `DEFAULT_SITE_THEME`, keeping static defaults aligned with the customiser defaults.

## Database

- Added migration `20260606140000_seo_theme_fields.sql`.
- The migration backfills `seo_title`, `seo_description` and `seo_image_url` into active `site_configurations.theme_data`.

## Verification

- Ran `git diff --check` successfully.
- Could not run `npm run build` in this Codex environment because `npm` is not installed here. Run the build in the real repo after applying.
