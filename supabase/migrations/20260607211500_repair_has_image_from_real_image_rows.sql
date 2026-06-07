-- Repair marketplace image sorting after API image-import patches.
--
-- has_image must describe real displayable stone_images rows only. It should
-- not be set optimistically from a feed field before the image row exists,
-- otherwise image-less listings sort to the front of the marketplace.

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

-- Full repair pass: undo any stale optimistic has_image=true values and
-- rebuild the flag from real image rows.
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

CREATE INDEX IF NOT EXISTS stones_dealer_media_sort_idx
  ON public.stones (dealer_id, status, feed_inactive, has_image DESC, created_at DESC);

COMMENT ON COLUMN public.stones.has_image IS
  'True only when at least one real stone_images row has a non-empty URL. Maintained by trg_stone_images_sync_has_image and used for marketplace image-first sorting.';

NOTIFY pgrst, 'reload schema';
