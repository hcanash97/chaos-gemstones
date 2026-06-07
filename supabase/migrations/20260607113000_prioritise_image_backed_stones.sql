-- Track whether a stone has at least one image so marketplace queries can
-- prioritise visual listings without needing to inspect joined image rows
-- after pagination has already happened.

ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS has_image BOOLEAN NOT NULL DEFAULT false;

UPDATE public.stones AS s
SET has_image = EXISTS (
  SELECT 1
  FROM public.stone_images AS i
  WHERE i.stone_id = s.id
    AND (
      NULLIF(btrim(i.storage_url), '') IS NOT NULL
      OR NULLIF(btrim(i.external_image_url), '') IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS stones_marketplace_media_sort_idx
  ON public.stones (is_test, feed_inactive, status, has_image DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS stones_dealer_media_sort_idx
  ON public.stones (dealer_id, status, feed_inactive, has_image DESC, created_at DESC);

NOTIFY pgrst, 'reload schema';
