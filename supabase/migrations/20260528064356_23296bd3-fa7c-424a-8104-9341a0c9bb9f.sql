
ALTER TABLE public.dealer_profiles
  ADD COLUMN IF NOT EXISTS external_feed_method TEXT NOT NULL DEFAULT 'GET',
  ADD COLUMN IF NOT EXISTS external_feed_body TEXT;

ALTER TABLE public.dealer_profiles
  ADD CONSTRAINT dealer_profiles_feed_method_chk
  CHECK (external_feed_method IN ('GET','POST'));

ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS crown_angle NUMERIC,
  ADD COLUMN IF NOT EXISTS pavilion_angle NUMERIC;

ALTER TABLE public.stone_images
  ADD COLUMN IF NOT EXISTS external_image_url TEXT;
