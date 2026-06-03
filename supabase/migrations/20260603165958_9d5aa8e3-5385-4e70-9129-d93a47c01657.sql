
-- 1) Profiles: hide sensitive columns from anon
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT (id, full_name, company_name, country, account_type, account_types, is_approved, is_verified, created_at, referral_code)
  ON public.profiles TO anon;

-- 2) stone_requests: drop public anon read, replace with authenticated-only
DROP POLICY IF EXISTS "public read open requests" ON public.stone_requests;
CREATE POLICY "authenticated read open requests"
  ON public.stone_requests
  FOR SELECT
  TO authenticated
  USING (status = 'open' AND expires_at > now());

-- 3) user_roles: explicit admin-only write policies
DROP POLICY IF EXISTS "admins insert roles" ON public.user_roles;
CREATE POLICY "admins insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins update roles" ON public.user_roles;
CREATE POLICY "admins update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins delete roles" ON public.user_roles;
CREATE POLICY "admins delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) SECURITY DEFINER hardening — revoke anon/authenticated EXECUTE on
-- internal trigger and helper functions that should never be called directly.
REVOKE EXECUTE ON FUNCTION public.assign_referral_code() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.apply_referral_code(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.issue_referral_credits(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.on_api_key_insert_check_referral() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.on_order_confirmed_check_referral() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.on_order_insert() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.on_order_receipt_confirmed() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.on_order_tracking_added() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.on_stone_insert_check_referral() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_account_type(uuid, text) FROM anon, public;

-- 5) Waitlist: validate basic email format on insert
DROP POLICY IF EXISTS "anyone can join waitlist" ON public.waitlist;
CREATE POLICY "anyone can join waitlist"
  ON public.waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 5 AND 254
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );
