-- Add referral fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);

-- Backfill referral codes for existing profiles
UPDATE public.profiles
SET referral_code = UPPER(SUBSTRING(MD5(id::text), 1, 8))
WHERE referral_code IS NULL;

-- Referral credits table
CREATE TABLE IF NOT EXISTS public.referral_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES public.profiles(id),
  credit_type TEXT NOT NULL,
  credit_months INTEGER NOT NULL DEFAULT 0,
  credit_gbp NUMERIC NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  qualifying_event TEXT NOT NULL,
  qualifying_event_at TIMESTAMPTZ,
  cross_side BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (beneficiary_id, qualifying_event, referral_id)
);

GRANT SELECT ON public.referral_credits TO authenticated;
GRANT ALL ON public.referral_credits TO service_role;

ALTER TABLE public.referral_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own credits"
  ON public.referral_credits
  FOR SELECT TO authenticated
  USING (auth.uid() = beneficiary_id);

CREATE POLICY "admins read all credits"
  ON public.referral_credits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins insert credits"
  ON public.referral_credits
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update credits"
  ON public.referral_credits
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_referral_credits_beneficiary ON public.referral_credits(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- Auto-generate referral code on new profile
CREATE OR REPLACE FUNCTION public.assign_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.id::text || clock_timestamp()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_assign_referral_code ON public.profiles;
CREATE TRIGGER profiles_assign_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_referral_code();