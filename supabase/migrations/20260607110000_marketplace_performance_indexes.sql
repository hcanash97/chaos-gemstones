-- ============================================================
-- Marketplace Performance Indexes
-- Covers the three query patterns:
--   1. Default unfiltered grid (is_test + feed_inactive + status + has_image + created_at)
--   2. Filtered queries (stone_type, shape, cert_lab, country_of_origin, carat_weight)
--   3. Count query (getMarketplaceTotal)
-- ============================================================

-- Primary index: unfiltered default grid ORDER BY
-- Covers: WHERE is_test=false AND feed_inactive=false AND status='available'
-- ORDER BY has_image DESC, has_360 DESC, has_video DESC, created_at DESC
CREATE INDEX IF NOT EXISTS stones_marketplace_default_sort_idx
  ON public.stones (has_image DESC, has_360 DESC, has_video DESC, created_at DESC)
  WHERE is_test = false AND feed_inactive = false AND status = 'available';

-- Total count query (getMarketplaceTotal) — head-only count
CREATE INDEX IF NOT EXISTS stones_marketplace_count_idx
  ON public.stones (status)
  WHERE is_test = false AND feed_inactive = false AND status = 'available';

-- Stone type filter (most common filter)
CREATE INDEX IF NOT EXISTS stones_stone_type_status_idx
  ON public.stones (stone_type, status)
  WHERE is_test = false AND feed_inactive = false;

-- Shape filter
CREATE INDEX IF NOT EXISTS stones_shape_status_idx
  ON public.stones (shape, status)
  WHERE is_test = false AND feed_inactive = false;

-- Cert lab filter
CREATE INDEX IF NOT EXISTS stones_cert_lab_status_idx
  ON public.stones (cert_lab, status)
  WHERE is_test = false AND feed_inactive = false;

-- Country of origin filter
CREATE INDEX IF NOT EXISTS stones_country_status_idx
  ON public.stones (country_of_origin, status)
  WHERE is_test = false AND feed_inactive = false;

-- Carat weight range filter
CREATE INDEX IF NOT EXISTS stones_carat_weight_idx
  ON public.stones (carat_weight)
  WHERE is_test = false AND feed_inactive = false AND status = 'available';

-- Price sort / range filter
CREATE INDEX IF NOT EXISTS stones_price_idx
  ON public.stones (wholesale_price_usd DESC NULLS LAST)
  WHERE is_test = false AND feed_inactive = false AND status = 'available';

-- Dealer filter (already exists as stones_dealer_idx but without the partial predicate)
CREATE INDEX IF NOT EXISTS stones_dealer_available_idx
  ON public.stones (dealer_id, created_at DESC)
  WHERE is_test = false AND feed_inactive = false AND status = 'available';

-- Featured stones (homepage query)
CREATE INDEX IF NOT EXISTS stones_featured_idx
  ON public.stones (featured, status)
  WHERE featured = true AND is_test = false;

NOTIFY pgrst, 'reload schema';
