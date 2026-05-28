-- Jeweller onboarding fields
ALTER TABLE public.jeweller_profiles
  ADD COLUMN IF NOT EXISTS primary_market TEXT,
  ADD COLUMN IF NOT EXISTS sourcing_method TEXT,
  ADD COLUMN IF NOT EXISTS primary_interests TEXT[] DEFAULT '{}';

-- GDPR soft delete
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stone_id UUID REFERENCES public.stones(id) ON DELETE SET NULL,
  dealer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jeweller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read reviews" ON public.reviews
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "jewellers insert own reviews" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = jeweller_id
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.jeweller_id = auth.uid() AND o.dealer_id = reviews.dealer_id
    )
  );
CREATE INDEX idx_reviews_dealer ON public.reviews(dealer_id);

-- Wishlists
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jeweller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stone_id UUID NOT NULL REFERENCES public.stones(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(jeweller_id, stone_id)
);
GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jewellers manage own wishlist" ON public.wishlists
  FOR ALL TO authenticated
  USING (auth.uid() = jeweller_id)
  WITH CHECK (auth.uid() = jeweller_id);
CREATE INDEX idx_wishlists_jeweller ON public.wishlists(jeweller_id);

-- Reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stone_id UUID NOT NULL REFERENCES public.stones(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jewellers insert reports" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "admins read reports" ON public.reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));