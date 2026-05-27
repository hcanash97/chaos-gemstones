
-- 1) Restrict anon column access on profiles to non-sensitive columns
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, full_name, company_name, city, country, website, account_type, is_approved, is_verified, created_at) ON public.profiles TO anon;

-- 2) Drop overly broad storage upload policies (folder-scoped dealer policies remain)
DROP POLICY IF EXISTS "authenticated upload cert-scans" ON storage.objects;
DROP POLICY IF EXISTS "authenticated upload stone-images" ON storage.objects;
DROP POLICY IF EXISTS "owners read cert-scans" ON storage.objects;
DROP POLICY IF EXISTS "owners update stone-images" ON storage.objects;
DROP POLICY IF EXISTS "owners delete cert-scans" ON storage.objects;
DROP POLICY IF EXISTS "owners delete stone-images" ON storage.objects;

-- 3) Lock down SECURITY DEFINER helpers that should not be RPC-callable
REVOKE EXECUTE ON FUNCTION public.notify_email_event(text, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.on_enquiry_insert_notify() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.on_enquiry_message_notify() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.on_profile_insert_notify() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.on_profile_approved_notify() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, public;
