-- Chaos Gemstones - media forensic report + imageLink backfill.
--
-- Use this after patch68/67 when marketplace media diagnostics still shows
-- very few stone_images rows.
--
-- It returns three result sets:
-- 1) summary counts
-- 2) common raw_import_row keys containing image/photo/thumb/media
-- 3) sample stones that have a raw imageLink but no stone_images row

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

-- Backfill image rows from stored raw feed JSON, if present.
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
      SELECT 1
      FROM public.stone_images AS existing
      WHERE existing.stone_id = c.stone_id
    ) AS is_primary,
    COALESCE((
      SELECT max(existing_sort.sort_order) + 1
      FROM public.stone_images AS existing_sort
      WHERE existing_sort.stone_id = c.stone_id
    ), 0) AS sort_order
  FROM candidates AS c
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.stone_images AS si
    WHERE si.stone_id = c.stone_id
      AND (
        si.storage_url = c.image_url
        OR si.external_image_url = c.image_url
      )
  )
  RETURNING stone_id
)
SELECT count(*) AS stone_images_inserted_this_run
FROM inserted;

-- Rebuild has_image from actual stone_images rows.
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

CREATE INDEX IF NOT EXISTS stones_marketplace_media_sort_idx
  ON public.stones (is_test, feed_inactive, status, has_image DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS stone_images_stone_sort_idx
  ON public.stone_images (stone_id, is_primary DESC, sort_order ASC);

NOTIFY pgrst, 'reload schema';

-- Result set 1: summary counts.
WITH available AS (
  SELECT *
  FROM public.stones
  WHERE is_test = false
    AND feed_inactive = false
    AND status = 'available'
),
available_image_rows AS (
  SELECT si.*
  FROM public.stone_images AS si
  JOIN available AS s ON s.id = si.stone_id
  WHERE NULLIF(btrim(COALESCE(si.storage_url, si.external_image_url)), '') IS NOT NULL
),
orphan_image_rows AS (
  SELECT si.*
  FROM public.stone_images AS si
  LEFT JOIN public.stones AS s ON s.id = si.stone_id
  WHERE s.id IS NULL
),
raw_image_candidates AS (
  SELECT s.*
  FROM public.stones AS s
  WHERE public.chaos_extract_still_image_url(s.raw_import_row) IS NOT NULL
)
SELECT *
FROM (
  SELECT 'available_stones' AS metric, count(*)::bigint AS value, 'Marketplace-visible stones' AS details FROM available
  UNION ALL
  SELECT 'all_stone_images', count(*)::bigint, 'All rows in public.stone_images' FROM public.stone_images
  UNION ALL
  SELECT 'available_stone_images', count(*)::bigint, 'Image rows attached to available marketplace stones' FROM available_image_rows
  UNION ALL
  SELECT 'orphan_stone_images', count(*)::bigint, 'Image rows whose stone_id no longer exists' FROM orphan_image_rows
  UNION ALL
  SELECT 'available_stones_has_image_true', count(*)::bigint, 'Available stones with has_image=true' FROM available WHERE has_image = true
  UNION ALL
  SELECT 'available_stones_with_actual_image_rows', count(DISTINCT stone_id)::bigint, 'Available stones with at least one real image row' FROM available_image_rows
  UNION ALL
  SELECT 'stones_with_raw_import_row', count(*)::bigint, 'Stones storing raw API payload JSON' FROM public.stones WHERE raw_import_row IS NOT NULL
  UNION ALL
  SELECT 'raw_rows_with_imageLink', count(*)::bigint, 'Raw rows with raw_import_row.imageLink present' FROM public.stones WHERE NULLIF(btrim(raw_import_row ->> 'imageLink'), '') IS NOT NULL
  UNION ALL
  SELECT 'raw_rows_with_accepted_image_url', count(*)::bigint, 'Raw rows where image URL extractor finds a URL' FROM raw_image_candidates
  UNION ALL
  SELECT 'raw_image_candidates_without_stone_images', count(*)::bigint, 'Rows with raw image URL but no image row yet' FROM raw_image_candidates c WHERE NOT EXISTS (SELECT 1 FROM public.stone_images si WHERE si.stone_id = c.id)
) AS report
ORDER BY
  CASE metric
    WHEN 'available_stones' THEN 1
    WHEN 'all_stone_images' THEN 2
    WHEN 'available_stone_images' THEN 3
    WHEN 'orphan_stone_images' THEN 4
    WHEN 'available_stones_has_image_true' THEN 5
    WHEN 'available_stones_with_actual_image_rows' THEN 6
    WHEN 'stones_with_raw_import_row' THEN 7
    WHEN 'raw_rows_with_imageLink' THEN 8
    WHEN 'raw_rows_with_accepted_image_url' THEN 9
    WHEN 'raw_image_candidates_without_stone_images' THEN 10
    ELSE 99
  END;

-- Result set 2: common raw_import_row keys that look media-related.
SELECT
  key,
  count(*) AS rows_with_key,
  min(NULLIF(btrim(raw_import_row ->> key), '')) AS example_value
FROM public.stones,
LATERAL jsonb_object_keys(raw_import_row) AS key
WHERE raw_import_row IS NOT NULL
  AND lower(key) ~ '(image|photo|picture|thumbnail|thumb|media|img|link)'
GROUP BY key
ORDER BY rows_with_key DESC, key
LIMIT 40;

-- Result set 3: sample raw image candidates missing stone_images rows.
SELECT
  s.id,
  s.cert_number,
  s.source_stock_no,
  s.stone_type,
  s.shape,
  s.carat_weight,
  public.chaos_extract_still_image_url(s.raw_import_row) AS detected_image_url,
  s.raw_import_row ->> 'imageLink' AS raw_image_link
FROM public.stones AS s
WHERE public.chaos_extract_still_image_url(s.raw_import_row) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.stone_images AS si
    WHERE si.stone_id = s.id
  )
ORDER BY s.updated_at DESC NULLS LAST
LIMIT 25;
