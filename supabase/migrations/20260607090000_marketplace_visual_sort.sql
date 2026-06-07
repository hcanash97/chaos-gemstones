-- ============================================================
-- Marketplace Visual Sort RPC
-- Surfaces image-rich stones first on the unfiltered homepage
-- grid, then randomises within each tier so the page feels
-- organic on every load. Pagination is stable within a session
-- via a caller-supplied numeric seed.
-- ============================================================

CREATE OR REPLACE FUNCTION public.marketplace_visual_sort(
  p_from      integer DEFAULT 0,
  p_to        integer DEFAULT 47,
  p_seed      float8  DEFAULT 0.5   -- caller passes a stable per-session float 0–1
)
RETURNS SETOF public.stones
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT s.*
  FROM   public.stones s
  WHERE  s.is_test        = false
    AND  s.feed_inactive  = false
    AND  s.status         = 'available'
  ORDER BY
    -- Tier 0: has at least one image row in stone_images
    CASE WHEN EXISTS (
      SELECT 1 FROM public.stone_images si
      WHERE  si.stone_id = s.id
        AND  (si.storage_url IS NOT NULL OR si.external_image_url IS NOT NULL)
    ) THEN 0

    -- Tier 1: no still image but has interactive media (360° or video)
    WHEN s.has_360 = true OR s.has_video = true THEN 1

    -- Tier 2: no media at all
    ELSE 2
    END ASC,

    -- Within each tier: deterministic shuffle keyed to the session seed
    -- setseed() cannot be called inside an ORDER BY expression, so we
    -- derive a per-row pseudo-random value without side effects.
    -- md5(seed_text || id) gives a stable per-session, per-row hash.
    md5(p_seed::text || s.id::text) ASC

  LIMIT  (p_to - p_from + 1)
  OFFSET p_from;
$$;

-- Grant execute to the anon and authenticated roles used by PostgREST
GRANT EXECUTE ON FUNCTION public.marketplace_visual_sort(integer, integer, float8)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.marketplace_visual_sort IS
  'Returns available marketplace stones ordered by image-tier first, then
   deterministically shuffled within each tier using a caller-supplied
   session seed. Used only on the unfiltered homepage grid.';

NOTIFY pgrst, 'reload schema';
