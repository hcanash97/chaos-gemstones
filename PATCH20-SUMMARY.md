# Patch 20 Summary

## Main fixes

- Fixed the mobile clear-inventory failure caused by production missing the newer `stones.external_sync_key` column.
- Added fallback backend logic so sync/clear can still run against older databases while the import identity migration is being applied.
- Changed imported inventory clearing to delete by selected stone IDs in 200-row batches, avoiding statement timeout risk from one large delete.
- Re-included the import identity Supabase migration that adds `external_source`, `source_stock_no`, `external_sync_key`, `last_imported_at`, and `raw_import_row`.
- Improved mobile admin usability: admin tabs and admin tables now scroll inside their own containers instead of forcing the whole page off-screen.
- Improved mobile Developer API key card layout: key text wraps inside the card and action buttons stack/wrap cleanly on phones.

## Important note

The migration in `supabase/migrations/20260605173000_import_identity_columns.sql` should still be applied in Supabase. The code now has a fallback, but the newer import identity columns are the long-term fix for clean duplicate prevention and safe imported-inventory clearing.
