CREATE TABLE IF NOT EXISTS public.site_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  theme_data JSONB NOT NULL DEFAULT jsonb_build_object(
    'logo_url', '',
    'accent_color', '#E8C97A',
    'hero_title', 'Verified diamonds & coloured stones, sourced direct from the world''s dealers.',
    'hero_subtitle', 'The global marketplace for independent gemstone dealers. Chaos connects dealers in Jaipur, Surat, Bangkok and Colombo with jewellers across the UK, US, Europe and Australia — browse, follow vendors, pull live inventory into your own site.',
    'contact_whatsapp', '',
    'homepage_layout', jsonb_build_array(
      jsonb_build_object('id', 'hero', 'type', 'hero', 'enabled', true),
      jsonb_build_object('id', 'cert_labs', 'type', 'cert_labs', 'enabled', true),
      jsonb_build_object('id', 'trust_strip', 'type', 'trust_strip', 'enabled', true),
      jsonb_build_object('id', 'audience_cards', 'type', 'audience_cards', 'enabled', true),
      jsonb_build_object('id', 'featured_stones', 'type', 'featured_stones', 'enabled', true),
      jsonb_build_object('id', 'matched_pairs', 'type', 'matched_pairs', 'enabled', true),
      jsonb_build_object('id', 'featured_vendors', 'type', 'featured_vendors', 'enabled', true),
      jsonb_build_object('id', 'founder_quote', 'type', 'founder_quote', 'enabled', true),
      jsonb_build_object('id', 'stats', 'type', 'stats', 'enabled', true)
    )
  )
);

ALTER TABLE public.site_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active site configurations" ON public.site_configurations;
CREATE POLICY "Public can read active site configurations"
  ON public.site_configurations
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can insert site configurations" ON public.site_configurations;
CREATE POLICY "Admins can insert site configurations"
  ON public.site_configurations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update site configurations" ON public.site_configurations;
CREATE POLICY "Admins can update site configurations"
  ON public.site_configurations
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.site_configurations (is_active)
SELECT true
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_configurations WHERE is_active = true
);
