-- Patch47 hardening for dealer API inventory identity.
--
-- The application now writes sync rows manually by matching existing ids first,
-- so live syncs no longer depend on PostgREST ON CONFLICT. These indexes still
-- repair the database shape for future fast paths and make duplicate detection
-- deterministic.

ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS source_stock_no TEXT,
  ADD COLUMN IF NOT EXISTS external_sync_key TEXT,
  ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_import_row JSONB;

UPDATE public.stones
SET external_sync_key = NULL
WHERE external_sync_key IS NOT NULL
  AND btrim(external_sync_key) = '';

UPDATE public.stones
SET source_stock_no = NULL
WHERE source_stock_no IS NOT NULL
  AND btrim(source_stock_no) = '';

UPDATE public.stones
SET cert_number = NULL
WHERE cert_number IS NOT NULL
  AND btrim(cert_number) = '';

UPDATE public.stones
SET external_sync_key = btrim(external_sync_key)
WHERE external_sync_key IS NOT NULL
  AND external_sync_key <> btrim(external_sync_key);

UPDATE public.stones
SET source_stock_no = btrim(source_stock_no)
WHERE source_stock_no IS NOT NULL
  AND source_stock_no <> btrim(source_stock_no);

UPDATE public.stones
SET cert_number = btrim(cert_number)
WHERE cert_number IS NOT NULL
  AND cert_number <> btrim(cert_number);

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
),
duplicates AS (
  SELECT id, external_sync_key
  FROM ranked
  WHERE duplicate_rank > 1
)
UPDATE public.stones AS s
SET
  external_sync_key = duplicates.external_sync_key || ':patch47-duplicate:' || left(s.id::text, 8),
  feed_inactive = true,
  notes_for_buyers = concat_ws(
    E'\n',
    nullif(s.notes_for_buyers, ''),
    'Chaos patch47 repair note: older duplicate private sync key was suffixed so API identity is unique.'
  )
FROM duplicates
WHERE s.id = duplicates.id;

WITH ranked AS (
  SELECT
    id,
    dealer_id,
    cert_number,
    row_number() OVER (
      PARTITION BY dealer_id, cert_number
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS duplicate_rank
  FROM public.stones
  WHERE cert_number IS NOT NULL
),
duplicates AS (
  SELECT id, cert_number
  FROM ranked
  WHERE duplicate_rank > 1
)
UPDATE public.stones AS s
SET
  cert_number = duplicates.cert_number || ':patch47-duplicate:' || left(s.id::text, 8),
  feed_inactive = true,
  notes_for_buyers = concat_ws(
    E'\n',
    nullif(s.notes_for_buyers, ''),
    'Chaos patch47 repair note: older duplicate dealer/certificate key was suffixed so fallback identity is unique.'
  )
FROM duplicates
WHERE s.id = duplicates.id;

DROP INDEX IF EXISTS stones_dealer_external_sync_key_idx;
DROP INDEX IF EXISTS stones_external_sync_key_idx;

CREATE UNIQUE INDEX IF NOT EXISTS stones_dealer_external_sync_key_unique_idx
  ON public.stones (dealer_id, external_sync_key);

CREATE UNIQUE INDEX IF NOT EXISTS stones_dealer_cert_number_unique_idx
  ON public.stones (dealer_id, cert_number);

CREATE INDEX IF NOT EXISTS stones_dealer_source_stock_no_idx
  ON public.stones (dealer_id, source_stock_no)
  WHERE source_stock_no IS NOT NULL;

NOTIFY pgrst, 'reload schema';
