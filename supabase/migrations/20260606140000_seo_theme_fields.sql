update public.site_configurations
set theme_data =
  coalesce(theme_data, '{}'::jsonb) ||
  jsonb_build_object(
    'seo_title', coalesce(theme_data ->> 'seo_title', 'CHAOS — Gemstone & Diamond Marketplace'),
    'seo_description', coalesce(theme_data ->> 'seo_description', 'The global B2B marketplace for independent gemstone and diamond dealers.'),
    'seo_image_url', coalesce(theme_data ->> 'seo_image_url', 'https://chaosgemstones.com/icons/icon-512.png')
  )
where is_active = true;
