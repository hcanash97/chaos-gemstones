-- Chaos Gemstones - Lovable DB import/media schema alignment.
--
-- Fixes the error:
--   ERROR 42703: column "raw_import_row" does not exist
--
-- Safe to rerun. Creates missing import identity columns, then attempts to
-- backfill stone_images from stored raw Nancy/Kodllin imageLink values.

ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS external_source text,
  ADD COLUMN IF NOT EXISTS external_sync_key text,
  ADD COLUMN IF NOT EXISTS source_stock_no text,
  ADD COLUMN IF NOT EXISTS raw_import_row jsonb,
  ADD COLUMN IF NOT EXISTS last_imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS has_image boolean NOT NULL DEFAULT false;

ALTER TABLE public.stone_images
  ADD COLUMN IF NOT EXISTS external_image_url text;

CREATE OR REPLACE FUNCTION public.chaos_is_trusted_image_field_url(value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    NULLIF(btrim(value), '') IS NOT NULL
    AND value ~* '^https?://'
    AND value !~* '(gem360|diamond360|v360|video|iframe|spin|viewer|certificate|cert|report|pdf)';
$$;

CREATE OR REPLACE FUNCTION public.chaos_extract_still_image_url(raw jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  direct_keys text[] := ARRAY[
    'imageLink', 'image_link', 'imageUrl', 'imageURL', 'image_url',
    'image', 'photo', 'photoUrl', 'photo_url', 'picture', 'pictureUrl',
    'picture_url', 'img', 'imgUrl', 'img_url', 'diamondImage',
    'stoneImage', 'mainImage', 'main_image', 'mediaUrl', 'media_url',
    'thumbnail', 'thumbnailUrl', 'thumbnail_url', 'thumb', 'thumbUrl',
    'thumb_url'
  ];
  key text;
  k text;
  v text;
BEGIN
  IF raw IS NULL OR jsonb_typeof(raw) <> 'object' THEN
    RETURN NULL;
  END IF;

  FOREACH key IN ARRAY direct_keys LOOP
    v := NULLIF(btrim(raw ->> key), '');
    IF public.chaos_is_trusted_image_field_url(v) THEN
      RETURN v;
    END IF;
  END LOOP;

  FOR k, v IN SELECT * FROM jsonb_each_text(raw) LOOP
    IF lower(regexp_replace(k, '[^a-zA-Z0-9]', '', 'g')) ~ '(image|photo|picture|thumbnail|thumb|media|img)'
      AND lower(regexp_replace(k, '[^a-zA-Z0-9]', '', 'g')) !~ '(video|360|viewer|iframe|certificate|cert|report|pdf)'
      AND public.chaos_is_trusted_image_field_url(v)
    THEN
      RETURN NULLIF(btrim(v), '');
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_stone_has_image()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.stone_id;
  ELSE
    target_id := NEW.stone_id;
  END IF;

  UPDATE public.stones AS s
  SET has_image = EXISTS (
    SELECT 1
    FROM public.stone_images AS si
    WHERE si.stone_id = target_id
      AND (
        NULLIF(btrim(si.storage_url), '') IS NOT NULL
        OR NULLIF(btrim(si.external_image_url), '') IS NOT NULL
      )
  )
  WHERE s.id = target_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_stone_images_sync_has_image ON public.stone_images;
CREATE TRIGGER trg_stone_images_sync_has_image
  AFTER INSERT OR UPDATE OR DELETE ON public.stone_images
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_stone_has_image();

CREATE TEMP TABLE IF NOT EXISTS chaos_media_repair_stats (
  metric text,
  value bigint,
  details text
) ON COMMIT DROP;

TRUNCATE chaos_media_repair_stats;

INSERT INTO chaos_media_repair_stats(metric, value, details)
SELECT 'available_stones', count(*), 'Available marketplace stones'
FROM public.stones
WHERE is_test = false AND feed_inactive = false AND status = 'available';

INSERT INTO chaos_media_repair_stats(metric, value, details)
SELECT 'stone_images_before', count(*), 'Rows in public.stone_images before this repair'
FROM public.stone_images;

INSERT INTO chaos_media_repair_stats(metric, value, details)
SELECT 'stones_with_raw_import_row', count(*), 'Rows with stored raw feed JSON. If 0, run a new sync after applying patch68 code.'
FROM public.stones
WHERE raw_import_row IS NOT NULL;

INSERT INTO chaos_media_repair_stats(metric, value, details)
SELECT 'raw_rows_with_imageLink', count(*), 'Stored raw rows with non-empty raw_import_row.imageLink'
FROM public.stones
WHERE NULLIF(btrim(raw_import_row ->> 'imageLink'), '') IS NOT NULL;

INSERT INTO chaos_media_repair_stats(metric, value, details)
SELECT 'raw_rows_with_accepted_image_url', count(*), 'Stored raw rows where Chaos accepts an image URL'
FROM public.stones
WHERE public.chaos_extract_still_image_url(raw_import_row) IS NOT NULL;

WITH candidates AS (
  SELECT
    s.id AS stone_id,
    public.chaos_extract_still_image_url(s.raw_import_row) AS image_url
  FROM public.stones AS s
  WHERE public.chaos_extract_still_image_url(s.raw_import_row) IS NOT NULL
),
inserted AS (
  INSERT INTO public.stone_images (
    stone_id,
    storage_url,
    external_image_url,
    is_primary,
    sort_order
  )
  SELECT
    c.stone_id,
    c.image_url,
    c.image_url,
    NOT EXISTS (
      SELECT 1 FROM public.stone_images AS existing
      WHERE existing.stone_id = c.stone_id
    ),
    COALESCE((
      SELECT max(existing_sort.sort_order) + 1
      FROM public.stone_images AS existing_sort
      WHERE existing_sort.stone_id = c.stone_id
    ), 0)
  FROM candidates AS c
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.stone_images AS si
    WHERE si.stone_id = c.stone_id
      AND (si.storage_url = c.image_url OR si.external_image_url = c.image_url)
  )
  RETURNING 1
)
INSERT INTO chaos_media_repair_stats(metric, value, details)
SELECT 'stone_images_inserted_from_raw_imageLink', count(*), 'New image rows inserted from stored raw imageLink/image_url fields'
FROM inserted;

UPDATE public.stones AS s
SET has_image = EXISTS (
  SELECT 1
  FROM public.stone_images AS si
  WHERE si.stone_id = s.id
    AND (
      NULLIF(btrim(si.storage_url), '') IS NOT NULL
      OR NULLIF(btrim(si.external_image_url), '') IS NOT NULL
    )
);

INSERT INTO chaos_media_repair_stats(metric, value, details)
SELECT 'stone_images_after', count(*), 'Rows in public.stone_images after this repair'
FROM public.stone_images;

INSERT INTO chaos_media_repair_stats(metric, value, details)
SELECT 'available_stones_with_images_after', count(*), 'Available stones with has_image=true after this repair'
FROM public.stones
WHERE is_test = false
  AND feed_inactive = false
  AND status = 'available'
  AND has_image = true;

CREATE INDEX IF NOT EXISTS stones_external_sync_key_idx
  ON public.stones (dealer_id, external_sync_key)
  WHERE external_sync_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS stones_source_stock_no_idx
  ON public.stones (dealer_id, source_stock_no)
  WHERE source_stock_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS stones_marketplace_media_sort_idx
  ON public.stones (is_test, feed_inactive, status, has_image DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS stone_images_stone_sort_idx
  ON public.stone_images (stone_id, is_primary DESC, sort_order ASC);

GRANT SELECT ON public.stone_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stone_images TO authenticated;
GRANT ALL ON public.stone_images TO service_role;

NOTIFY pgrst, 'reload schema';

SELECT *
FROM chaos_media_repair_stats
ORDER BY
  CASE metric
    WHEN 'available_stones' THEN 1
    WHEN 'stone_images_before' THEN 2
    WHEN 'stones_with_raw_import_row' THEN 3
    WHEN 'raw_rows_with_imageLink' THEN 4
    WHEN 'raw_rows_with_accepted_image_url' THEN 5
    WHEN 'stone_images_inserted_from_raw_imageLink' THEN 6
    WHEN 'stone_images_after' THEN 7
    WHEN 'available_stones_with_images_after' THEN 8
    ELSE 99
  END;
