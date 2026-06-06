UPDATE public.site_configurations
SET theme_data = jsonb_set(
  theme_data,
  '{homepage_layout}',
  COALESCE(theme_data->'homepage_layout', '[]'::jsonb) ||
    CASE
      WHEN COALESCE(theme_data->'homepage_layout', '[]'::jsonb) @> '[{"type":"whatsapp_cta"}]'::jsonb
        THEN '[]'::jsonb
      ELSE jsonb_build_array(jsonb_build_object('id', 'whatsapp_cta', 'type', 'whatsapp_cta', 'enabled', false))
    END
)
WHERE theme_data ? 'homepage_layout';

UPDATE public.site_configurations
SET theme_data = theme_data || jsonb_build_object(
  'homepage_copy',
  jsonb_build_object(
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
WHERE NOT (theme_data ? 'homepage_copy');
