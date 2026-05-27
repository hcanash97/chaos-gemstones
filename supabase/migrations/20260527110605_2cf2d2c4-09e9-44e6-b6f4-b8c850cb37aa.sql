
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_accepted_ip TEXT;

CREATE TABLE IF NOT EXISTS public.dealer_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jeweller_id UUID NOT NULL,
  dealer_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (jeweller_id, dealer_id)
);

GRANT SELECT, INSERT, DELETE ON public.dealer_follows TO authenticated;
GRANT ALL ON public.dealer_follows TO service_role;

ALTER TABLE public.dealer_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jewellers manage own follows"
  ON public.dealer_follows
  FOR ALL
  TO authenticated
  USING (auth.uid() = jeweller_id)
  WITH CHECK (auth.uid() = jeweller_id);

CREATE POLICY "dealers read own followers"
  ON public.dealer_follows
  FOR SELECT
  TO authenticated
  USING (auth.uid() = dealer_id);

CREATE INDEX IF NOT EXISTS idx_dealer_follows_dealer ON public.dealer_follows(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_follows_jeweller ON public.dealer_follows(jeweller_id);
