CREATE TABLE IF NOT EXISTS public.site_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  theme_data JSONB NOT NULL DEFAULT jsonb_build_object(
    'logo_url', '',
    'accent_color', '#E8C97A',
    'hero_title', 'Verified diamonds & coloured stones, sourced direct from the world''s dealers.',
    'hero_subtitle', 'The global marketplace for independent gemstone dealers. Chaos connects dealers in Jaipur, Surat, Bangkok and Colombo with jewellers across the UK, US, Europe and Australia — browse, follow vendors, pull live inventory into your own site.',
    'hero_badge_label', 'B2B · For the trade',
    'hero_background_image_url', '',
    'hero_overlay_opacity', 0.62,
    'contact_whatsapp', '',
    'homepage_layout', jsonb_build_array(
      jsonb_build_object('id', 'hero', 'type', 'hero', 'enabled', true),
      jsonb_build_object('id', 'cert_labs', 'type', 'cert_labs', 'enabled', true),
      jsonb_build_object('id', 'trust_strip', 'type', 'trust_strip', 'enabled', true),
      jsonb_build_object('id', 'audience_cards', 'type', 'audience_cards', 'enabled', true),
      jsonb_build_object('id', 'whatsapp_cta', 'type', 'whatsapp_cta', 'enabled', false),
      jsonb_build_object('id', 'featured_stones', 'type', 'featured_stones', 'enabled', true),
      jsonb_build_object('id', 'matched_pairs', 'type', 'matched_pairs', 'enabled', true),
      jsonb_build_object('id', 'featured_vendors', 'type', 'featured_vendors', 'enabled', true),
      jsonb_build_object('id', 'founder_quote', 'type', 'founder_quote', 'enabled', true),
      jsonb_build_object('id', 'stats', 'type', 'stats', 'enabled', true)
    ),
    'homepage_copy', jsonb_build_object(
      'featured_stones_eyebrow', 'Featured Inventory',
      'featured_stones_title', 'Hand-picked stones',
      'featured_stones_link_label', 'View all',
      'matched_pairs_eyebrow', 'Matched Pairs',
      'matched_pairs_title', 'Matched pairs — ideal for earrings and symmetric settings',
      'matched_pairs_body', 'Browse colour-, cut- and weight-matched pairs from verified dealers. Save hours of back-and-forth sourcing for symmetrical commissions.',
      'matched_pairs_link_label', 'Browse matched pairs',
      'featured_vendors_eyebrow', 'Trusted Suppliers',
      'featured_vendors_title', 'Featured vendors',
      'featured_vendors_link_label', 'View all',
      'whatsapp_cta_title', 'Want help sourcing a specific stone?',
      'whatsapp_cta_body', 'Send Chaos the brief by WhatsApp. We can help turn a client request into a focused search across verified dealer inventory.',
      'whatsapp_cta_button_label', 'Message Chaos on WhatsApp'
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
