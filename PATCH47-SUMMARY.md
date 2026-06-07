# Patch 47 Summary

## What Changed Since Friday

The sync moved from a safer manual write approach toward a faster Supabase
`.upsert(..., { onConflict })` approach. That fast path only works when the
live database has the exact matching unique indexes and Supabase/PostgREST has
reloaded its schema cache.

Your latest log shows the live site could not see the private API identity
columns, so it fell back to legacy certificate-number syncing. Then Postgres
returned:

`42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification`

That means the database was missing the exact unique index for the conflict key
the code tried to use. Values like `LG644416855` are not bad values; they look
like valid IGI/LG certificate numbers. The failure is database identity/index
alignment.

## Main Fix

- Updated `src/lib/dealer-sync.server.ts`.
- Removed the fragile live-sync dependency on Supabase `ON CONFLICT`.
- Patch47 now writes feed rows manually:
  - find the matching existing stone by private sync key/certificate/stock key
  - update by internal database `id` when found
  - insert only when no existing row is matched
- This avoids Postgres `42P10` entirely during the sync run.
- Batch size stays at 200, but each row is now protected from the missing-index
  failure that caused the long repeated error list.

## Better Diagnostics

- Added a server-side error summary diagnostic.
- If errors happen, the sync log now includes:
  - total failed events
  - Postgres error-code counts
  - top failing fields
  - suggested fixes for common errors like `42P10`, `23502`, `23505`, `22P02`
- Added a frontend `Copy summary` button to the Error Diagnostics Log.
- The copied text is intentionally high level, so you can paste it into Codex
  without sending hundreds of repeated row lines.

## SQL / Lovable Database Fix

Added:

`20260607110000_patch47_sync_identity_hardening.sql`

This migration:

- ensures the private API identity columns exist
- trims blank sync/certificate/stock values
- suffixes older duplicate private sync keys and duplicate dealer/certificate
  keys
- recreates the exact full unique indexes:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS stones_dealer_external_sync_key_unique_idx
  ON public.stones (dealer_id, external_sync_key);

CREATE UNIQUE INDEX IF NOT EXISTS stones_dealer_cert_number_unique_idx
  ON public.stones (dealer_id, cert_number);
```

- reloads the Supabase/PostgREST schema cache with:

```sql
NOTIFY pgrst, 'reload schema';
```

## Important Note

Yes, the SQL/database section is likely part of what changed. The live error
means the app and database disagree about which columns/indexes exist. Patch47
fixes both sides: the migration repairs the database shape, and the app no
longer depends on perfect `ON CONFLICT` support to finish syncing.

## Verification

- Manual file inspection completed.
- `npm run build` could not be run in this extracted Codex workspace because
  npm is unavailable here. Run it in the real repo after applying the patch.
