CREATE TABLE public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'catalogue',
  stone_id UUID REFERENCES public.stones(id) ON DELETE CASCADE,
  stone_type TEXT,
  rule_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_rules TO authenticated;
GRANT ALL ON public.pricing_rules TO service_role;

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dealers manage own rules"
  ON public.pricing_rules
  FOR ALL
  TO authenticated
  USING (auth.uid() = dealer_id)
  WITH CHECK (auth.uid() = dealer_id);

CREATE INDEX idx_pricing_rules_dealer ON public.pricing_rules(dealer_id) WHERE is_active = true;