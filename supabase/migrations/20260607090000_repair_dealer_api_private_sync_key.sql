-- Repair the dealer API/import sync identity after later UI patches.
-- The sync engine now uses external_sync_key as the private conflict target so
-- blank public certificate numbers do not create duplicates and clear-imported
-- inventory can reliably find API-created stones.

ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS source_stock_no TEXT,
  ADD COLUMN IF NOT EXISTS external_sync_key TEXT,
  ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_import_row JSONB;

WITH ranked AS (
  SELECT
    id,
    dealer_id,
    external_sync_key,
    row_number() OVER (
      PARTITION BY dealer_id, external_sync_key
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS duplicate_rank
  FROM public.stones
  WHERE external_sync_key IS NOT NULL
    AND btrim(external_sync_key) <> ''
),
duplicates AS (
  SELECT id, external_sync_key
  FROM ranked
  WHERE duplicate_rank > 1
)
UPDATE public.stones AS s
SET
  external_sync_key = duplicates.external_sync_key || ':duplicate:' || left(s.id::text, 8),
  feed_inactive = true,
  notes_for_buyers = concat_ws(
    E'\n',
    nullif(s.notes_for_buyers, ''),
    'Chaos sync repair note: this older duplicate private sync key was given a suffix so future API syncs can upsert safely.'
  )
FROM duplicates
WHERE s.id = duplicates.id;

DROP INDEX IF EXISTS stones_dealer_external_sync_key_idx;

CREATE UNIQUE INDEX IF NOT EXISTS stones_dealer_external_sync_key_unique_idx
  ON public.stones (dealer_id, external_sync_key);

CREATE INDEX IF NOT EXISTS stones_dealer_source_stock_no_idx
  ON public.stones (dealer_id, source_stock_no)
  WHERE source_stock_no IS NOT NULL;

notify pgrst, 'reload schema';
