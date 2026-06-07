-- Focused repair for live projects where PostgREST still cannot see the
-- private API import identity columns after the earlier sync-key migration.

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
    'Chaos schema repair note: older duplicate private sync key was suffixed so API feed upserts can use a unique dealer/sync key.'
  )
FROM duplicates
WHERE s.id = duplicates.id;

DROP INDEX IF EXISTS stones_dealer_external_sync_key_idx;

CREATE UNIQUE INDEX IF NOT EXISTS stones_dealer_external_sync_key_unique_idx
  ON public.stones (dealer_id, external_sync_key);

CREATE INDEX IF NOT EXISTS stones_dealer_source_stock_no_idx
  ON public.stones (dealer_id, source_stock_no)
  WHERE source_stock_no IS NOT NULL;

-- Reload PostgREST/Supabase schema cache. This is the bit that resolves
-- PGRST204 "Could not find the column in the schema cache" after columns exist.
NOTIFY pgrst, 'reload schema';
