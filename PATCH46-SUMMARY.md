# Patch 46 Summary

## What This Fixes

The latest sync showed:

`Postgres 42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification`

This does **not** mean `LG698547611` is invalid. That value looks like an IGI lab-grown certificate/report number and should be stored as `cert_number`.

The real issue is database alignment:

- The code attempted `onConflict: dealer_id,cert_number` because live Supabase could not see the newer private sync-key columns.
- The live database did not have a matching unique index for `(dealer_id, cert_number)`.
- Postgres refuses an upsert unless the exact conflict target has a unique/exclusion index.

## Code Fix

- Updated `src/lib/dealer-sync.server.ts`.
- If Postgres returns `42P10`, Chaos now uses a manual update/insert fallback for both:
  - private sync-key mode
  - legacy cert-number fallback mode
- This prevents thousands of row-by-row failures while the live database migration catches up.
- Diagnostics now include the attempted `onConflict` target so the database problem is obvious.

## Migration Added

Added:

`20260607100000_repair_legacy_cert_conflict_target.sql`

This migration:

- trims blank cert numbers
- safely suffixes older duplicate dealer/cert rows
- creates the missing unique index:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS stones_dealer_cert_number_unique_idx
  ON public.stones (dealer_id, cert_number);
```

- reloads the Supabase/PostgREST schema cache

## Recommended Migration Order

Apply both, in this order:

1. `20260607100000_repair_legacy_cert_conflict_target.sql`
2. `20260607093000_repair_api_identity_schema_cache.sql`

Then refresh the app and rerun Nancy sync.

## Verification

- `git diff --check` passed.
- `npm run build` could not be run in this Codex environment because `npm` is unavailable here.
