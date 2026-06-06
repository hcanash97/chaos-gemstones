# Patch 30 Summary

Patch30 is cumulative for patches 24 through 30. You can apply patch30 directly without applying the earlier patch folders separately.

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
- Hero visual controls: badge label, background image, background upload and overlay strength.

## New in patch30

- Added shared `useSiteTheme` hook so site settings are fetched once through the same React Query cache.
- Added `SiteThemeBridge`, mounted at root level.
- The saved accent colour now updates global CSS variables:
  - `--color-gold`
  - `--color-gold-foreground`
  - `--gold-border`
- Header logo now uses the uploaded site logo from Theme settings.
- Footer logo now uses the uploaded site logo from Theme settings.
- Homepage now uses the shared theme hook instead of its own duplicate theme query.

## Files included

- `src/routes/__root.tsx`
- `src/hooks/useSiteTheme.ts`
- `src/components/site/SiteThemeBridge.tsx`
- `src/components/site/Logo.tsx`
- `src/components/site/SiteHeader.tsx`
- plus all cumulative files from patches 24-29

## Database migrations included

- `20260606120000_site_configurations.sql`
- `20260606123000_homepage_layout_blocks.sql`
- `20260606124500_homepage_copy_and_whatsapp_block.sql`
- `20260606130000_hero_visual_settings.sql`

## After copying

Run your Supabase migrations, then build:

```bash
npm run build
```

I could not run a full build in this extracted patch workspace.
