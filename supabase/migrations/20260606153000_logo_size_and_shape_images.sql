update public.site_configurations
set theme_data =
  coalesce(theme_data, '{}'::jsonb) ||
  jsonb_build_object(
    'logo_mark_size',
    case
      when coalesce(theme_data, '{}'::jsonb) ? 'logo_mark_size'
        and (theme_data ->> 'logo_mark_size') ~ '^[0-9]+(\.[0-9]+)?$'
      then least(64, greatest(18, (theme_data ->> 'logo_mark_size')::numeric))
      else 26
    end,
    'shape_card_images',
    case
      when jsonb_typeof(coalesce(theme_data -> 'shape_card_images', '{}'::jsonb)) = 'object'
      then coalesce(theme_data -> 'shape_card_images', '{}'::jsonb)
      else '{}'::jsonb
    end
  )
where is_active = true;

notify pgrst, 'reload schema';
