# Patch 29 Summary

Patch29 is cumulative for patches 24 through 29. You can apply patch29 directly without applying the earlier patch folders separately.

## Includes prior recent changes

- Profile image upload fixes.
- Retail showroom and Retail Mode URL support.
- Expanded FAQ and retail links.
- Mobile marketplace 2-column grid.
- Stone card accessibility and alt text improvements.
- Site settings table, RLS policies and admin Theme tab.
- Homepage block engine with enable/disable and up/down controls.
- Editable homepage section copy.
- WhatsApp CTA homepage block.

## New in patch29

- Added hero visual controls to the admin Theme tab:
  - hero badge label
  - hero background image URL
  - hero background image upload
  - hero overlay strength slider
  - remove hero background button
- Public homepage hero now renders the selected background image.
- Public homepage hero uses the saved overlay strength so text remains readable over images.
- Admin live preview now reflects the hero background image, overlay strength and badge label.
- Added migration to backfill new hero visual fields for existing site configurations.

## Database migrations included

- `20260606120000_site_configurations.sql`
- `20260606123000_homepage_layout_blocks.sql`
- `20260606124500_homepage_copy_and_whatsapp_block.sql`
- `20260606130000_hero_visual_settings.sql`

## Files included

- `src/routes/dashboard.account.tsx`
- `src/hooks/useRetailMode.ts`
- `src/routes/retail.tsx`
- `src/routes/faq.tsx`
- `src/components/site/SiteHeader.tsx`
- `src/routes/sitemap[.]xml.ts`
- `src/routes/marketplace.tsx`
- `src/components/site/StoneCard.tsx`
- `src/routes/admin.tsx`
- `src/routes/index.tsx`
- `src/lib/site-theme.ts`
- `src/integrations/supabase/types.ts`
- `supabase/migrations/20260606120000_site_configurations.sql`
- `supabase/migrations/20260606123000_homepage_layout_blocks.sql`
- `supabase/migrations/20260606124500_homepage_copy_and_whatsapp_block.sql`
- `supabase/migrations/20260606130000_hero_visual_settings.sql`

## After copying

Run your Supabase migrations, then build:

```bash
npm run build
```

I could not run a full build in this extracted patch workspace.
