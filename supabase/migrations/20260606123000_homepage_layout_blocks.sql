UPDATE public.site_configurations
SET theme_data = theme_data || jsonb_build_object(
  'homepage_layout',
  jsonb_build_array(
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
WHERE NOT (theme_data ? 'homepage_layout');
