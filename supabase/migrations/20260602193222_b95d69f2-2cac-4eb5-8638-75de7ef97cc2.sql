CREATE TABLE IF NOT EXISTS public.stone_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jeweller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stone_type TEXT NOT NULL,
  shape TEXT[] DEFAULT '{}',
  min_carat NUMERIC,
  max_carat NUMERIC,
  colour_description TEXT,
  max_budget_usd NUMERIC,
  cert_lab TEXT,
  treatment TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.stone_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stone_requests TO authenticated;
GRANT ALL ON public.stone_requests TO service_role;

ALTER TABLE public.stone_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read open requests"
  ON public.stone_requests FOR SELECT
  USING (status = 'open' AND expires_at > now());

CREATE POLICY "jewellers read own requests"
  ON public.stone_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = jeweller_id);

CREATE POLICY "jewellers insert own requests"
  ON public.stone_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = jeweller_id);

CREATE POLICY "jewellers update own requests"
  ON public.stone_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = jeweller_id)
  WITH CHECK (auth.uid() = jeweller_id);

CREATE POLICY "jewellers delete own requests"
  ON public.stone_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = jeweller_id);

CREATE INDEX IF NOT EXISTS stone_requests_status_expires_idx
  ON public.stone_requests (status, expires_at DESC);