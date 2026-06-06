create table if not exists public.site_configurations (
  id uuid primary key default gen_random_uuid(),
  is_active boolean not null default true,
  theme_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_configurations
  add column if not exists created_at timestamptz not null default now();

alter table public.site_configurations
  add column if not exists updated_at timestamptz not null default now();

alter table public.site_configurations enable row level security;

grant select on public.site_configurations to anon, authenticated;
grant insert, update on public.site_configurations to authenticated;

drop trigger if exists site_configurations_set_updated_at on public.site_configurations;

create or replace function public.set_site_configurations_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger site_configurations_set_updated_at
before update on public.site_configurations
for each row
execute function public.set_site_configurations_updated_at();

drop policy if exists "Public can read active site configurations" on public.site_configurations;
create policy "Public can read active site configurations"
  on public.site_configurations
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins can insert site configurations" on public.site_configurations;
create policy "Admins can insert site configurations"
  on public.site_configurations
  for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins can update site configurations" on public.site_configurations;
create policy "Admins can update site configurations"
  on public.site_configurations
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

insert into public.site_configurations (is_active, theme_data)
select true, '{}'::jsonb
where not exists (
  select 1 from public.site_configurations where is_active = true
);

update public.site_configurations
set theme_data =
  jsonb_build_object(
    'site_name', 'Chaos',
    'logo_url', '',
    'accent_color', '#E8C97A',
    'hero_title', 'Verified diamonds & coloured stones, sourced direct from the world''s dealers.',
    'hero_subtitle', 'The global marketplace for independent gemstone dealers. Chaos connects dealers in Jaipur, Surat, Bangkok and Colombo with jewellers across the UK, US, Europe and Australia — browse, follow vendors, pull live inventory into your own site.',
    'hero_badge_label', 'B2B · For the trade',
    'hero_background_image_url', '',
    'hero_overlay_opacity', 0.62,
    'hero_media_type', 'image',
    'hero_video_url', '',
    'hero_primary_cta_label', 'Browse marketplace',
    'hero_primary_cta_url', '/marketplace',
    'hero_secondary_cta_label', 'Sign up',
    'hero_secondary_cta_url', '/sign-up',
    'animation_preset', 'luxury-fade',
    'enable_parallax', true,
    'primary_glow_color', '#E8C97A',
    'contact_whatsapp', '',
    'contact_email', '',
    'instagram_url', 'https://www.instagram.com/chaosgemstonemarket',
    'footer_tagline', 'The global marketplace for independent gemstone dealers.',
    'footer_notice', 'All prices shown are wholesale USD. CHAOS is a B2B platform for verified trade professionals only.',
    'seo_title', 'CHAOS — Gemstone & Diamond Marketplace',
    'seo_description', 'The global B2B marketplace for independent gemstone and diamond dealers.',
    'seo_image_url', 'https://chaosgemstones.com/icons/icon-512.png',
    'ticker_enabled', true,
    'ticker_mode', 'manual',
    'ticker_items', jsonb_build_array(
      'Verified dealers uploading live inventory',
      'Lab diamonds, coloured stones and matched pairs',
      'API sync, CSV import and WhatsApp intake workflows'
    ),
    'ticker_speed_seconds', 36,
    'shape_grid_enabled', true,
    'shape_grid_title', 'Browse by diamond shape',
    'shape_grid_mode', 'grid',
    'homepage_layout', jsonb_build_array(
      jsonb_build_object('id', 'hero', 'type', 'hero', 'enabled', true),
      jsonb_build_object('id', 'ticker', 'type', 'ticker', 'enabled', true),
      jsonb_build_object('id', 'cert_labs', 'type', 'cert_labs', 'enabled', true),
      jsonb_build_object('id', 'trust_strip', 'type', 'trust_strip', 'enabled', true),
      jsonb_build_object('id', 'audience_cards', 'type', 'audience_cards', 'enabled', true),
      jsonb_build_object('id', 'shape_grid', 'type', 'shape_grid', 'enabled', true),
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
  ) || coalesce(theme_data, '{}'::jsonb)
where is_active = true;

notify pgrst, 'reload schema';
