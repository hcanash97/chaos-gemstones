CREATE POLICY "anon read approved dealer profiles"
ON public.profiles
FOR SELECT
TO anon
USING (account_type = 'dealer' AND is_approved = true);

GRANT SELECT ON public.profiles TO anon;