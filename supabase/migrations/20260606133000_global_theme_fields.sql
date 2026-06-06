update public.site_configurations
set theme_data =
  coalesce(theme_data, '{}'::jsonb) ||
  jsonb_build_object(
    'site_name', coalesce(theme_data ->> 'site_name', 'Chaos'),
    'hero_primary_cta_label', coalesce(theme_data ->> 'hero_primary_cta_label', 'Browse marketplace'),
    'hero_primary_cta_url', coalesce(theme_data ->> 'hero_primary_cta_url', '/marketplace'),
    'hero_secondary_cta_label', coalesce(theme_data ->> 'hero_secondary_cta_label', 'Sign up'),
    'hero_secondary_cta_url', coalesce(theme_data ->> 'hero_secondary_cta_url', '/sign-up'),
    'contact_email', coalesce(theme_data ->> 'contact_email', ''),
    'instagram_url', coalesce(theme_data ->> 'instagram_url', 'https://www.instagram.com/chaosgemstonemarket'),
    'footer_tagline', coalesce(theme_data ->> 'footer_tagline', 'The global marketplace for independent gemstone dealers.'),
    'footer_notice', coalesce(theme_data ->> 'footer_notice', 'All prices shown are wholesale USD. CHAOS is a B2B platform for verified trade professionals only.')
  )
where is_active = true;
