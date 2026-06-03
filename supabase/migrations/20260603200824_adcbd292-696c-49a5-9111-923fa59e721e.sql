
-- 1) Tighten orders insert: require dealer_id = auth.uid() AND jeweller_id is an approved jeweller
DROP POLICY IF EXISTS "dealers insert own orders" ON public.orders;
CREATE POLICY "dealers insert own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = dealer_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = orders.jeweller_id
        AND p.is_approved = true
        AND (p.account_type = 'jeweller'::public.account_type
             OR 'jeweller' = ANY(p.account_types))
    )
  );

-- 2) stone_requests: restrict broad authenticated read to approved dealers only
DROP POLICY IF EXISTS "authenticated read open requests" ON public.stone_requests;
CREATE POLICY "approved dealers read open requests"
  ON public.stone_requests FOR SELECT
  TO authenticated
  USING (
    status = 'open'
    AND expires_at > now()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_approved = true
        AND (p.account_type = 'dealer'::public.account_type
             OR 'dealer' = ANY(p.account_types))
    )
  );

-- 3) stone_images: tie public read to parent stone visibility
DROP POLICY IF EXISTS "public read stone images" ON public.stone_images;
CREATE POLICY "public read stone images for visible stones"
  ON public.stone_images FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stones s
      WHERE s.id = stone_images.stone_id
        AND s.status = 'available'::public.stone_status
        AND s.is_test = false
    )
  );
-- Dealers and admins keep full access via existing dealers/admins policies on stones table;
-- add an authenticated read for owners/admins so dashboards still see their own stone images.
CREATE POLICY "owners and admins read stone images"
  ON public.stone_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stones s
      WHERE s.id = stone_images.stone_id
        AND (s.dealer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  );

-- 4) Reaffirm column-level grants on profiles so anon cannot read sensitive columns
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, full_name, company_name, country, account_type, account_types,
  is_approved, is_verified, created_at, referral_code, website, city
) ON public.profiles TO anon;
