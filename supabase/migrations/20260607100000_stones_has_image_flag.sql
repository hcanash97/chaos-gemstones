-- ============================================================
-- Add has_image column to stones + trigger to keep it current
-- This gives PostgREST a real boolean column to ORDER BY,
-- replacing the broken RPC approach from patch11.
-- ============================================================

-- 1. Add the column (nullable first for backfill, then set NOT NULL)
ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS has_image boolean NOT NULL DEFAULT false;

-- 2. Backfill: mark any stone that already has at least one image row
UPDATE public.stones s
SET has_image = true
WHERE EXISTS (
  SELECT 1 FROM public.stone_images si
  WHERE si.stone_id = s.id
    AND (
      (si.storage_url       IS NOT NULL AND si.storage_url       <> '')
      OR
      (si.external_image_url IS NOT NULL AND si.external_image_url <> '')
    )
);

-- 3. Trigger function: fires on INSERT/UPDATE/DELETE on stone_images
CREATE OR REPLACE FUNCTION public.sync_stone_has_image()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_id uuid;
BEGIN
  -- Determine which stone_id changed
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.stone_id;
  ELSE
    target_id := NEW.stone_id;
  END IF;

  -- Recompute has_image for that stone
  UPDATE public.stones
  SET has_image = EXISTS (
    SELECT 1 FROM public.stone_images si2
    WHERE si2.stone_id = target_id
      AND (
        (si2.storage_url       IS NOT NULL AND si2.storage_url       <> '')
        OR
        (si2.external_image_url IS NOT NULL AND si2.external_image_url <> '')
      )
  )
  WHERE id = target_id;

  RETURN NULL; -- AFTER trigger: return value ignored
END;
$$;

-- 4. Attach trigger
DROP TRIGGER IF EXISTS trg_stone_images_sync_has_image ON public.stone_images;
CREATE TRIGGER trg_stone_images_sync_has_image
  AFTER INSERT OR UPDATE OR DELETE ON public.stone_images
  FOR EACH ROW EXECUTE FUNCTION public.sync_stone_has_image();

-- 5. Index for the ORDER BY query
CREATE INDEX IF NOT EXISTS stones_has_image_created_idx
  ON public.stones (has_image DESC, created_at DESC)
  WHERE is_test = false AND feed_inactive = false AND status = 'available';

-- 6. Drop the patch11 RPC — no longer needed
DROP FUNCTION IF EXISTS public.marketplace_visual_sort(integer, integer, float8);

COMMENT ON COLUMN public.stones.has_image IS
  'True when at least one stone_images row with a non-empty URL exists.
   Maintained automatically by trg_stone_images_sync_has_image.
   Used as the primary ORDER BY key on the unfiltered marketplace grid.';

NOTIFY pgrst, 'reload schema';
