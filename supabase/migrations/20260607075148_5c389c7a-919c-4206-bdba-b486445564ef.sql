
-- 1) Storage: remove broad any-auth write policies on 'assets' bucket; restrict to admins
DROP POLICY IF EXISTS "assets_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "assets_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "assets_auth_delete" ON storage.objects;

CREATE POLICY "admins insert assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins update assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins delete assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Storage: remove broad any-auth write policies on 'stone-images' bucket; rely on per-dealer folder policies + admin override
DROP POLICY IF EXISTS "stone_images_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "stone_images_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "stone_images_auth_delete" ON storage.objects;

CREATE POLICY "admins manage stone images" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'stone-images' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'stone-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) site_configurations: remove account_type-based admin policy and redundant unconditional public read
DROP POLICY IF EXISTS "site_configurations_admin_write" ON public.site_configurations;
DROP POLICY IF EXISTS "site_configurations_public_read" ON public.site_configurations;
-- The remaining policies ("Public can read active site configurations",
-- "Admins can insert site configurations", "Admins can update site configurations")
-- already use has_role() / is_active = true, which is the correct model.
