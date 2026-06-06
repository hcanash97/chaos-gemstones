UPDATE public.site_configurations
SET theme_data = theme_data
  || CASE
    WHEN theme_data ? 'hero_badge_label' THEN '{}'::jsonb
    ELSE jsonb_build_object('hero_badge_label', 'B2B · For the trade')
  END
  || CASE
    WHEN theme_data ? 'hero_background_image_url' THEN '{}'::jsonb
    ELSE jsonb_build_object('hero_background_image_url', '')
  END
  || CASE
    WHEN theme_data ? 'hero_overlay_opacity' THEN '{}'::jsonb
    ELSE jsonb_build_object('hero_overlay_opacity', 0.62)
  END;
