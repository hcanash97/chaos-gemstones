
-- Phase 1: expand stones table
ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS fluorescence_colour text,
  ADD COLUMN IF NOT EXISTS measurements_length numeric,
  ADD COLUMN IF NOT EXISTS measurements_width numeric,
  ADD COLUMN IF NOT EXISTS measurements_height numeric,
  ADD COLUMN IF NOT EXISTS lw_ratio numeric,
  ADD COLUMN IF NOT EXISTS depth_pct numeric,
  ADD COLUMN IF NOT EXISTS table_pct numeric,
  ADD COLUMN IF NOT EXISTS girdle text,
  ADD COLUMN IF NOT EXISTS culet_size text,
  ADD COLUMN IF NOT EXISTS culet_condition text,
  ADD COLUMN IF NOT EXISTS shade text,
  ADD COLUMN IF NOT EXISTS milky text,
  ADD COLUMN IF NOT EXISTS eye_clean text,
  ADD COLUMN IF NOT EXISTS black_inclusion text,
  ADD COLUMN IF NOT EXISTS enhancement text,
  ADD COLUMN IF NOT EXISTS phenomenon text,
  ADD COLUMN IF NOT EXISTS matching_pair boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_video boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_360 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provenance_report text,
  ADD COLUMN IF NOT EXISTS listing_type text NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS parcel_quantity integer,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

-- Note: colour_hue, colour_tone, colour_saturation already exist on stones.

-- RPC to safely increment view_count from anonymous visitors.
CREATE OR REPLACE FUNCTION public.increment_stone_view(_stone_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.stones SET view_count = view_count + 1 WHERE id = _stone_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_stone_view(uuid) TO anon, authenticated;

-- Phase 1: saved_searches table
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jeweller_id uuid NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  notify_daily boolean NOT NULL DEFAULT true,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;
GRANT ALL ON public.saved_searches TO service_role;

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jewellers read own saved searches"
  ON public.saved_searches FOR SELECT TO authenticated
  USING (auth.uid() = jeweller_id);

CREATE POLICY "jewellers insert own saved searches"
  ON public.saved_searches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = jeweller_id);

CREATE POLICY "jewellers update own saved searches"
  ON public.saved_searches FOR UPDATE TO authenticated
  USING (auth.uid() = jeweller_id);

CREATE POLICY "jewellers delete own saved searches"
  ON public.saved_searches FOR DELETE TO authenticated
  USING (auth.uid() = jeweller_id);

CREATE INDEX IF NOT EXISTS idx_saved_searches_jeweller ON public.saved_searches(jeweller_id);
