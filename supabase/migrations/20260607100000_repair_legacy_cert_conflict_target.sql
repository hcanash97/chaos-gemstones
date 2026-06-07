-- Repair for legacy dealer API sync fallback.
--
-- If the private API identity columns are not yet visible in the live
-- Supabase/PostgREST schema cache, the application falls back to syncing by
-- (dealer_id, cert_number). Postgres can only use ON CONFLICT for that target
-- when a matching unique index exists.

UPDATE public.stones
SET cert_number = NULL
WHERE cert_number IS NOT NULL
  AND btrim(cert_number) = '';

UPDATE public.stones
SET cert_number = btrim(cert_number)
WHERE cert_number IS NOT NULL
  AND cert_number <> btrim(cert_number);

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
    AND btrim(cert_number) <> ''
),
duplicates AS (
  SELECT id, cert_number
  FROM ranked
  WHERE duplicate_rank > 1
)
UPDATE public.stones AS s
SET
  cert_number = duplicates.cert_number || ':legacy-duplicate:' || left(s.id::text, 8),
  feed_inactive = true,
  notes_for_buyers = concat_ws(
    E'\n',
    nullif(s.notes_for_buyers, ''),
    'Chaos legacy sync repair note: older duplicate cert number was suffixed so fallback feed upserts can use dealer/cert as a unique key.'
  )
FROM duplicates
WHERE s.id = duplicates.id;

CREATE UNIQUE INDEX IF NOT EXISTS stones_dealer_cert_number_unique_idx
  ON public.stones (dealer_id, cert_number);

NOTIFY pgrst, 'reload schema';
