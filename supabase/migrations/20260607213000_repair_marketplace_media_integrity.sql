-- Repair and harden marketplace media integrity.
--
-- The marketplace must sort by real image rows, not by optimistic feed values.
-- Run this in Lovable SQL if migrations are not applied automatically.

ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS has_image boolean NOT NULL DEFAULT false;

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
