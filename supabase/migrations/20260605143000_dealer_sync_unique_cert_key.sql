-- The external dealer sync now upserts by (dealer_id, cert_number).
-- PostgreSQL needs a matching unique index for Supabase/PostgREST onConflict.
-- Existing duplicate certs are preserved by moving older duplicates onto a
-- deterministic migration key and marking them feed-inactive.

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
  cert_number = duplicates.cert_number || ':duplicate:' || left(s.id::text, 8),
  feed_inactive = true,
  notes_for_buyers = concat_ws(
    E'\n',
    nullif(s.notes_for_buyers, ''),
    'Chaos sync migration note: this older duplicate cert number was given a migration suffix so live feed upserts can use a unique dealer/cert key.'
  )
FROM duplicates
WHERE s.id = duplicates.id;

CREATE UNIQUE INDEX IF NOT EXISTS stones_dealer_cert_number_unique_idx
  ON public.stones (dealer_id, cert_number);
