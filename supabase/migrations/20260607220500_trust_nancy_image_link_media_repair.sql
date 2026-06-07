-- Trust explicit image fields such as Nancy/Kodllin imageLink.
--
-- Some image URLs do not end in .jpg/.png/etc. If the value comes from a
-- trusted image field name, accept any http(s) URL unless it is clearly a
-- 360/video/cert/report/pdf URL.

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

CREATE OR REPLACE FUNCTION public.chaos_is_still_image_url(value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    NULLIF(btrim(value), '') IS NOT NULL
    AND value ~* '^https?://'
    AND value !~* '(gem360|diamond360|v360|video|iframe|spin|viewer|certificate|cert|report|pdf)'
    AND (
      value ~* '\.(jpe?g|png|webp|gif|avif)(\?|#|$)'
      OR value ~* '(image|photo|picture|thumbnail|thumb|media|img)'
    );
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

CREATE TEMP TABLE IF NOT EXISTS chaos_image_link_repair_stats (
  metric text,
  value bigint,
  details text
) ON COMMIT DROP;

TRUNCATE chaos_image_link_repair_stats;

INSERT INTO chaos_image_link_repair_stats(metric, value, details)
SELECT 'raw_rows_with_imageLink', count(*), 'Stored raw rows with a non-empty Nancy/Kodllin imageLink value'
FROM public.stones
WHERE NULLIF(btrim(raw_import_row ->> 'imageLink'), '') IS NOT NULL;

INSERT INTO chaos_image_link_repair_stats(metric, value, details)
SELECT 'raw_rows_with_accepted_image_url', count(*), 'Stored raw rows where Chaos now accepts the image field URL'
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
INSERT INTO chaos_image_link_repair_stats(metric, value, details)
SELECT 'stone_images_inserted_from_imageLink', count(*), 'New stone_images rows inserted after trusting explicit image fields'
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

INSERT INTO chaos_image_link_repair_stats(metric, value, details)
SELECT 'stone_images_after', count(*), 'Total stone_images rows after repair'
FROM public.stone_images;

INSERT INTO chaos_image_link_repair_stats(metric, value, details)
SELECT 'available_stones_with_images_after', count(*), 'Available marketplace stones with has_image=true after repair'
FROM public.stones
WHERE is_test = false
  AND feed_inactive = false
  AND status = 'available'
  AND has_image = true;

NOTIFY pgrst, 'reload schema';

SELECT *
FROM chaos_image_link_repair_stats
ORDER BY
  CASE metric
    WHEN 'raw_rows_with_imageLink' THEN 1
    WHEN 'raw_rows_with_accepted_image_url' THEN 2
    WHEN 'stone_images_inserted_from_imageLink' THEN 3
    WHEN 'stone_images_after' THEN 4
    WHEN 'available_stones_with_images_after' THEN 5
    ELSE 99
  END;
