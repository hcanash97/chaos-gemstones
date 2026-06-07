# Patch 49 Summary

## Main Fix

No-image stones should not dominate the marketplace or homepage.

Patch49 adds a database-backed `has_image` flag and uses it for public ordering:

- marketplace listings now sort image-backed stones first
- no-image listings remain discoverable, but move later in the stock list
- the selected sort still applies inside each group, for example:
  - image-backed newest first
  - then no-image newest later

## SQL Added

Added:

`20260607113000_prioritise_image_backed_stones.sql`

This migration:

- adds `stones.has_image boolean not null default false`
- backfills it from existing `stone_images`
- adds marketplace/vendor sort indexes
- reloads the Supabase/PostgREST schema cache

Run this migration before relying on the updated marketplace query.

## Other Issues Found And Fixed

- The marketplace had a `Has images` checkbox in the UI/filter model, but the
  server search was not actually applying it. Patch49 wires it to
  `stones.has_image`.
- Homepage featured stones could include no-image stones. Patch49 only shows
  featured stones with images on the homepage.
- Vendor/dealer catalogue pages were sorted by newest only, so no-image stones
  could appear first there too. Patch49 prioritises image-backed stones there.
- API sync, CSV import, and manual dashboard image uploads now maintain the
  `has_image` flag as inventory changes.
- Removing the last manual dashboard image sets `has_image` back to false.

## What To Check

After applying:

1. Run the new SQL migration.
2. Refresh `/marketplace`.
3. Page 1 should show stones with images first.
4. No-image stones should appear later, usually near the end for `Newest`.
5. The `Has images` checkbox should now actually filter server-side.

## Verification

- Manual diff inspection completed.
- `npm run build` could not be run in this extracted Codex workspace because
  npm is unavailable here. Run it in the real repo after applying the patch.
