-- Repair marketplace visibility defaults for API-imported inventory.
--
-- This keeps imported feed rows visible unless a later sync deliberately marks
-- them inactive. It is intentionally scoped to likely API-imported rows so sold
-- or manual inventory is not broadly reset.

ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS external_sync_key TEXT,
  ADD COLUMN IF NOT EXISTS source_stock_no TEXT,
  ADD COLUMN IF NOT EXISTS raw_import_row JSONB,
  ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMPTZ;

ALTER TABLE public.stones
  ALTER COLUMN status SET DEFAULT 'available',
  ALTER COLUMN is_test SET DEFAULT false,
  ALTER COLUMN feed_inactive SET DEFAULT false;

UPDATE public.stones
SET
  status = 'available',
  is_test = false,
  feed_inactive = false
WHERE
  (
    external_sync_key IS NOT NULL
    OR source_stock_no IS NOT NULL
    OR raw_import_row IS NOT NULL
    OR last_imported_at IS NOT NULL
    OR cert_number LIKE 'stock:%'
  )
  AND status <> 'sold';

NOTIFY pgrst, 'reload schema';
