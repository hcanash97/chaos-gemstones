# Patch39 Summary

Built from the current `/Users/hamishnash/Documents/GitHub/chaos-gemstones` repo state, including patch38.

## Root Cause

The Theme editor is failing with:

```text
Could not find the table 'public.site_configurations' in the schema cache
```

This means the live Supabase database does not currently have the `public.site_configurations` table available to the API. The frontend cannot save theme edits until that database table exists.

Copying React files alone cannot fix this specific error. The Supabase migration must be applied to the live Supabase project.

## Database Repair

Added migration:

```text
supabase/migrations/20260606150000_repair_site_configurations.sql
```

This migration:

- Creates `public.site_configurations` if missing.
- Adds `created_at` and `updated_at` if missing.
- Enables RLS.
- Adds explicit grants for `anon` and `authenticated`.
- Recreates public read/admin insert/admin update policies.
- Inserts an active config row if none exists.
- Backfills the full current theme JSON defaults.
- Runs:

```sql
notify pgrst, 'reload schema';
```

That asks Supabase/PostgREST to refresh its schema cache after the table is created.

## Frontend Improvements

- Detects the exact missing-table/schema-cache error.
- Shows a clear admin warning:
  - `Theme database setup is missing`
  - explains that the migration must be applied.
- Disables theme save/upload actions while the database setup is missing.
- Keeps the diagnostics log explicit rather than showing generic save failures.

## Important Next Step

After applying this patch, the migration must be run against Supabase.

Options:

1. If you use Supabase CLI:

```bash
supabase db push
```

2. If you are using the Supabase dashboard, open the SQL editor and run the contents of:

```text
supabase/migrations/20260606150000_repair_site_configurations.sql
```

Then refresh the website admin Theme editor and click `Reload saved theme`.

## Verification

- Ran `git diff --check` successfully.
- Could not run `npm run build` in this Codex environment because `npm` is not installed here. Run the build in the real repo after applying.
