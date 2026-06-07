-- Patch 61: admin outreach queue for incomplete dealer profiles.

CREATE TABLE IF NOT EXISTS public.dealer_profile_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  issues TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'drafted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.dealer_profile_outreach
  DROP CONSTRAINT IF EXISTS dealer_profile_outreach_status_check;

ALTER TABLE public.dealer_profile_outreach
  ADD CONSTRAINT dealer_profile_outreach_status_check
  CHECK (status IN ('drafted', 'sent', 'resolved', 'dismissed'));

CREATE INDEX IF NOT EXISTS dealer_profile_outreach_dealer_idx
  ON public.dealer_profile_outreach (dealer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS dealer_profile_outreach_status_idx
  ON public.dealer_profile_outreach (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.dealer_profile_outreach TO authenticated;
GRANT ALL ON public.dealer_profile_outreach TO service_role;

ALTER TABLE public.dealer_profile_outreach ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage dealer profile outreach" ON public.dealer_profile_outreach;
CREATE POLICY "admins manage dealer profile outreach"
  ON public.dealer_profile_outreach
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
