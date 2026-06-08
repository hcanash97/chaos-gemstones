
-- 1. Revoke SELECT on sensitive dealer feed credentials from public roles
REVOKE SELECT (external_feed_url, external_feed_method, external_feed_body)
  ON public.dealer_profiles FROM anon, authenticated;

-- 2. Revoke SELECT on sensitive jeweller pricing/strategy columns from public roles
REVOKE SELECT (markup_global, feed_currency, display_currency, sourcing_method)
  ON public.jeweller_profiles FROM anon, authenticated;

-- 3. Fix function search_path mutability
ALTER FUNCTION public.chaos_extract_still_image_url(jsonb) SET search_path = public;
ALTER FUNCTION public.chaos_is_trusted_image_field_url(text) SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.sync_stone_has_image() SET search_path = public;

-- 4. Restrict public bucket listing: drop broad SELECT, keep public URL access (bucket-public flag)
DROP POLICY IF EXISTS "assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "stone_images_public_read" ON storage.objects;

-- 5. Add admin-only policy on system_config (RLS enabled, no policies = unusable; restrict to admins)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_config TO authenticated;
GRANT ALL ON public.system_config TO service_role;
DROP POLICY IF EXISTS "admins manage system_config" ON public.system_config;
CREATE POLICY "admins manage system_config" ON public.system_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 6. Align anon dealer-profile visibility with dual-role (account_types contains 'dealer')
DROP POLICY IF EXISTS "anon read approved dealer profiles" ON public.profiles;
CREATE POLICY "anon read approved dealer profiles" ON public.profiles
  FOR SELECT TO anon
  USING (
    is_approved = true
    AND (account_type = 'dealer'::account_type OR 'dealer' = ANY(account_types))
  );
