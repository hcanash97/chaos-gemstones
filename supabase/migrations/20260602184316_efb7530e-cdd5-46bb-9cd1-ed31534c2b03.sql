-- 1. Add account_types array column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_types TEXT[] DEFAULT NULL;

-- 2. Backfill from existing single account_type
UPDATE public.profiles
  SET account_types = ARRAY[account_type::text]
  WHERE account_types IS NULL AND account_type IS NOT NULL;

-- 3. Helper function to check if a user has a specific account type
CREATE OR REPLACE FUNCTION public.has_account_type(_user_id UUID, _check_type TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND (account_type::text = _check_type OR _check_type = ANY(account_types))
  );
$$;

-- 4. One-time fix: give Clio Diamonds dual role
UPDATE public.profiles
  SET account_types = ARRAY['dealer', 'jeweller'],
      account_type = 'dealer'
  WHERE email = 'clio@clio-diamonds.com'
     OR company_name ILIKE '%clio%diamond%';

-- 5. Ensure dealer_profiles + jeweller_profiles rows exist for any dual-role accounts
INSERT INTO public.dealer_profiles (id, slug)
SELECT p.id, 'dealer-' || substr(p.id::text, 1, 8)
FROM public.profiles p
WHERE 'dealer' = ANY(p.account_types)
  AND NOT EXISTS (SELECT 1 FROM public.dealer_profiles d WHERE d.id = p.id);

INSERT INTO public.jeweller_profiles (id)
SELECT p.id
FROM public.profiles p
WHERE 'jeweller' = ANY(p.account_types)
  AND NOT EXISTS (SELECT 1 FROM public.jeweller_profiles j WHERE j.id = p.id);