-- Marketplace price-per-carat filtering support.
-- This makes /ct price filters accurate at the database level instead of
-- filtering only the already-loaded browser page.

ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS wholesale_price_per_carat numeric
    GENERATED ALWAYS AS (
      CASE
        WHEN wholesale_price_usd IS NOT NULL
          AND carat_weight IS NOT NULL
          AND carat_weight > 0
        THEN wholesale_price_usd / carat_weight
        ELSE NULL
      END
    ) STORED;

CREATE INDEX IF NOT EXISTS stones_price_per_carat_idx
  ON public.stones (wholesale_price_per_carat)
  WHERE is_test = false
    AND feed_inactive = false
    AND status = 'available'
    AND wholesale_price_per_carat IS NOT NULL;

COMMENT ON COLUMN public.stones.wholesale_price_per_carat IS
  'Generated USD price per carat used for accurate marketplace /ct filtering and sorting.';

NOTIFY pgrst, 'reload schema';
