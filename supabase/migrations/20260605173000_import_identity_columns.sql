-- Adds private import identity columns so external-feed syncs do not have to
-- overload the public certificate/report number forever.

ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS source_stock_no TEXT,
  ADD COLUMN IF NOT EXISTS external_sync_key TEXT,
  ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_import_row JSONB;

CREATE INDEX IF NOT EXISTS stones_dealer_external_sync_key_idx
  ON public.stones (dealer_id, external_sync_key)
  WHERE external_sync_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS stones_dealer_source_stock_no_idx
  ON public.stones (dealer_id, source_stock_no)
  WHERE source_stock_no IS NOT NULL;
