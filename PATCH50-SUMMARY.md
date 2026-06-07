# Patch 50 Summary

## Diagnosis

Patch49 introduced `stones.has_image` and then immediately used that column in
live reads:

- marketplace select/order/filter
- homepage featured-stone query
- vendor catalogue query

If the SQL migration was not applied, or Supabase/PostgREST had not reloaded its
schema cache yet, those queries would fail with a missing-column/schema-cache
error. The marketplace then showed no stones.

This is why the site appeared blank after the image-prioritisation patch.

## Recovery Fix

Patch50 removes the hard runtime dependency on `stones.has_image`.

- Marketplace no longer selects, filters, or orders by `has_image`.
- Homepage no longer filters by `has_image`.
- Vendor pages no longer select/order by `has_image`.
- API sync, CSV import, and dashboard image uploads no longer write to
  `has_image`, so they will not fail if the column is missing.

## Image Ordering Still Improved

Patch50 still improves image presentation safely:

- marketplace resolves images from `stone_images`
- image-backed stones are lifted within the loaded page
- the `Has images` checkbox filters the loaded page without crashing
- homepage featured stones fetch more candidates, then keep the first 8 with
  images
- vendor catalogue pages lift image-backed cards within the page

This is less perfect than database-level image sorting, but it is safe while the
live database catches up.

## SQL Note

The patch49 SQL migration can still be useful later:

`20260607113000_prioritise_image_backed_stones.sql`

But the app should not depend on it being applied before stones can render.

## What To Check

After applying patch50:

1. Refresh `/marketplace`.
2. Stones should appear again.
3. Image-backed cards should appear before no-image cards within the visible
   page.
4. Run the SQL migration later when convenient if you want the stronger
   database-level image sort.

## Verification

- Manual grep/diff inspection completed.
- `npm run build` could not be run in this extracted Codex workspace because
  npm is unavailable here. Run it in the real repo after applying the patch.
