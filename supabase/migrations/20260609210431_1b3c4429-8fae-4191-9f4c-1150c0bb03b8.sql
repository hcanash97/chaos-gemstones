DROP POLICY IF EXISTS "anon read approved dealer profiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated read approved dealer profiles" ON public.profiles;

CREATE OR REPLACE VIEW public.dealer_profiles_public
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.full_name,
  p.company_name,
  p.city,
  p.country,
  p.account_type,
  p.account_types,
  p.is_approved,
  p.is_verified,
  p.website,
  p.created_at
FROM public.profiles p
WHERE p.is_approved = true
  AND (p.account_type = 'dealer'::public.account_type
       OR 'dealer' = ANY (p.account_types));

ALTER VIEW public.dealer_profiles_public OWNER TO postgres;

REVOKE ALL ON public.dealer_profiles_public FROM PUBLIC;
GRANT SELECT ON public.dealer_profiles_public TO anon, authenticated;

NOTIFY pgrst, 'reload schema';