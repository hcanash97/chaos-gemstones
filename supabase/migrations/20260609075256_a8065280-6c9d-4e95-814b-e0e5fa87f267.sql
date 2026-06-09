DROP POLICY IF EXISTS "authenticated read approved dealer profiles" ON public.profiles;
CREATE POLICY "authenticated read approved dealer profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    is_approved = true
    AND (account_type = 'dealer'::account_type OR 'dealer' = ANY(account_types))
  );