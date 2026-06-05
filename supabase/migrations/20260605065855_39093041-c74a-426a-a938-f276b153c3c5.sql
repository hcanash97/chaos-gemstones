
-- 1. api_keys: allow dual-role accounts to create jeweller-type keys
DROP POLICY IF EXISTS "approved jewellers create own keys" ON public.api_keys;
CREATE POLICY "approved jewellers create own keys" ON public.api_keys
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = jeweller_id
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_approved = true
      AND (p.account_type = 'jeweller'::account_type OR 'jeweller' = ANY(p.account_types))
  )
);

-- 2. stone_requests INSERT: require approved jeweller
DROP POLICY IF EXISTS "jewellers insert own requests" ON public.stone_requests;
CREATE POLICY "jewellers insert own requests" ON public.stone_requests
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = jeweller_id
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_approved = true
      AND (p.account_type = 'jeweller'::account_type OR 'jeweller' = ANY(p.account_types))
  )
);

-- 3. stone_request_responses INSERT: require approved dealer
DROP POLICY IF EXISTS "dealers insert own responses" ON public.stone_request_responses;
CREATE POLICY "dealers insert own responses" ON public.stone_request_responses
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = dealer_id
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_approved = true
      AND (p.account_type = 'dealer'::account_type OR 'dealer' = ANY(p.account_types))
  )
);

-- 4. profiles: hide email, phone, terms_accepted_at, terms_accepted_ip from anon and authenticated
--    Admin server code uses the service_role key and is unaffected by column grants.
--    Own email is available via auth.users (supabase.auth session); we update client to use that.
REVOKE SELECT (email, phone, terms_accepted_at, terms_accepted_ip)
  ON public.profiles FROM anon, authenticated;
