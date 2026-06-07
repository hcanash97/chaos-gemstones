# Patch 51 Summary

## Diagnosis

The sync log proves the stones are being inserted:

- 7,247 valid rows prepared
- 37 batches saved
- 0 database errors shown

So the problem moved from **sync/import** to **marketplace visibility**.

The marketplace can hide rows if:

- the advanced marketplace query errors on a stale/missing schema field
- rows are not `status = available`
- rows are `is_test = true`
- rows are `feed_inactive = true`
- a page-level filter, such as image/per-carat filtering, removes every card
  from the current page

## Code Fixes

### Safer Marketplace Query

Updated `src/lib/marketplace.functions.ts`.

- Added a simple fallback query using only stable core columns.
- If the advanced query fails, Chaos now tries the fallback instead of returning
  a blank marketplace.
- The response now includes visibility totals:
  - all stones
  - available stones
  - public-visible stones

### Marketplace UI Diagnostics

Updated `src/routes/marketplace.tsx`.

- Shows a visible diagnostic panel if the marketplace query falls back or fails.
- Shows all/available/public-visible counts.
- Shows a clear panel when the current page has matching rows but the visible
  list is empty after page-level filters.
- Adds quick actions to go to page 1 or clear filters.

### Sync Visibility Defaults

Updated `src/lib/dealer-sync.server.ts`.

Imported API rows now explicitly write safe marketplace defaults:

- `status: "available"`
- `is_test: false`
- `feed_inactive: false`
- `has_video: false` unless provided
- `has_360: false` unless provided
- `matching_pair: false` unless provided
- sensible quantity/listing/currency defaults

This avoids relying on database defaults when importing thousands of rows.

### Sync Diagnostic Summary

The sync log now includes a plain-English outcome summary:

- whether the run was a fresh rebuild
- whether a repeat sync mostly updated existing rows
- whether it suspiciously created many new rows despite existing inventory

## SQL Repair Added

Added:

`20260607115500_marketplace_visibility_defaults.sql`

This migration:

- ensures private API identity columns exist
- reinforces marketplace defaults
- repairs likely API-imported rows so they are:
  - available
  - not test
  - not feed inactive
- reloads Supabase schema cache

## What To Check After Applying

1. Refresh `/marketplace`.
2. If stones still do not show, look for the new amber diagnostic panel.
3. The useful numbers are:
   - `All stones`
   - `Available status`
   - `Public visible`

If `All stones` is high but `Public visible` is 0, the database rows are being
hidden by status/test/feed flags.

If the diagnostic mentions a schema/cache error, run the latest SQL migrations.

## Verification

- Manual grep/diff inspection completed.
- `npm run build` could not be run in this extracted Codex workspace because
  npm is unavailable here. Run it in the real repo after applying the patch.
