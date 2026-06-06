# Patch 28 Summary

Patch28 is cumulative for patches 24 through 28. You can apply patch28 directly without applying patch24, patch25, patch26 or patch27 separately.

## Includes prior recent changes

- Profile image upload fixes for jeweller/dealer logos and dealer covers.
- Retail showroom route and Retail Mode URL support.
- Expanded FAQ and retail links.
- Mobile marketplace 2-column grid.
- Stone card accessibility and alt text improvements.
- Site settings table, RLS policies, admin Theme tab, homepage dynamic hero settings.
- Homepage block engine with enable/disable and up/down controls.

## New in patch28

- Added editable homepage section copy via `theme_data.homepage_copy`.
- Added a new `whatsapp_cta` homepage block type.
- Admin Theme tab can now edit:
  - featured stones eyebrow
  - featured stones heading
  - featured vendors eyebrow
  - featured vendors heading
  - matched pairs heading/body
  - WhatsApp CTA heading/body/button label
- Homepage sections now render these editable copy values.
- Added a WhatsApp CTA section that can be enabled, disabled and reordered like other blocks.
- Added a migration to backfill `homepage_copy` and add the WhatsApp CTA block to existing configurations.

## Database migrations included

- `20260606120000_site_configurations.sql`
- `20260606123000_homepage_layout_blocks.sql`
- `20260606124500_homepage_copy_and_whatsapp_block.sql`

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

## After copying

Run your Supabase migrations, then build:

```bash
npm run build
```

I could not run a full build in this extracted patch workspace.
