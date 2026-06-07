-- ============================================================
-- Text Search & Normalisation Indexes
-- Fixes ILIKE scan performance for free-text search and
-- the case-variant expansion in stone_type / origin filters.
-- ============================================================

-- Enable trigram extension (already present in Supabase by default,
-- IF NOT EXISTS makes this safe to run even if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Generated lowercase columns ───────────────────────────────────────────────
-- Storing lowercase versions lets us do exact equality matches instead of
-- case-variant IN() lists. The GENERATED ALWAYS column stays in sync
-- automatically on every insert/update.

ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS stone_type_lower text
    GENERATED ALWAYS AS (lower(stone_type)) STORED;

ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS origin_lower text
    GENERATED ALWAYS AS (lower(COALESCE(origin, ''))) STORED;

-- ── Btree indexes on lowercase columns ───────────────────────────────────────
-- Exact match on lower(stone_type) is now O(log n) instead of O(n)
CREATE INDEX IF NOT EXISTS stones_stone_type_lower_idx
  ON public.stones (stone_type_lower)
  WHERE is_test = false AND feed_inactive = false;

CREATE INDEX IF NOT EXISTS stones_origin_lower_idx
  ON public.stones (origin_lower)
  WHERE is_test = false AND feed_inactive = false;

-- ── GIN trigram indexes for free-text ILIKE search ───────────────────────────
-- ILIKE '%term%' with a leading wildcard cannot use btree.
-- GIN trigram indexes make ILIKE fast even with leading wildcards.

CREATE INDEX IF NOT EXISTS stones_stone_type_trgm_idx
  ON public.stones USING gin (stone_type gin_trgm_ops)
  WHERE is_test = false AND feed_inactive = false;

CREATE INDEX IF NOT EXISTS stones_shape_trgm_idx
  ON public.stones USING gin (shape gin_trgm_ops)
  WHERE is_test = false AND feed_inactive = false;

CREATE INDEX IF NOT EXISTS stones_country_of_origin_trgm_idx
  ON public.stones USING gin (country_of_origin gin_trgm_ops)
  WHERE is_test = false AND feed_inactive = false;

CREATE INDEX IF NOT EXISTS stones_colour_grade_trgm_idx
  ON public.stones USING gin (colour_grade gin_trgm_ops)
  WHERE is_test = false AND feed_inactive = false;

CREATE INDEX IF NOT EXISTS stones_cert_lab_trgm_idx
  ON public.stones USING gin (cert_lab gin_trgm_ops)
  WHERE is_test = false AND feed_inactive = false;

CREATE INDEX IF NOT EXISTS stones_colour_hue_trgm_idx
  ON public.stones USING gin (colour_hue gin_trgm_ops)
  WHERE is_test = false AND feed_inactive = false;

NOTIFY pgrst, 'reload schema';
