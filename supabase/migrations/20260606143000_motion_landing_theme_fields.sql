update public.site_configurations
set theme_data =
  coalesce(theme_data, '{}'::jsonb) ||
  jsonb_build_object(
    'hero_media_type', coalesce(theme_data ->> 'hero_media_type', 'image'),
    'hero_video_url', coalesce(theme_data ->> 'hero_video_url', ''),
    'animation_preset', coalesce(theme_data ->> 'animation_preset', 'luxury-fade'),
    'enable_parallax', coalesce((theme_data ->> 'enable_parallax')::boolean, true),
    'primary_glow_color', coalesce(theme_data ->> 'primary_glow_color', '#E8C97A'),
    'ticker_enabled', coalesce((theme_data ->> 'ticker_enabled')::boolean, true),
    'ticker_mode', coalesce(theme_data ->> 'ticker_mode', 'manual'),
    'ticker_items', coalesce(
      theme_data -> 'ticker_items',
      '["Verified dealers uploading live inventory","Lab diamonds, coloured stones and matched pairs","API sync, CSV import and WhatsApp intake workflows"]'::jsonb
    ),
    'ticker_speed_seconds', coalesce((theme_data ->> 'ticker_speed_seconds')::numeric, 36),
    'shape_grid_enabled', coalesce((theme_data ->> 'shape_grid_enabled')::boolean, true),
    'shape_grid_title', coalesce(theme_data ->> 'shape_grid_title', 'Browse by diamond shape'),
    'shape_grid_mode', coalesce(theme_data ->> 'shape_grid_mode', 'grid')
  )
where is_active = true;
