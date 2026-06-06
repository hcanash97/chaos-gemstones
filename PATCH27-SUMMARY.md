# Patch 27 Summary

Patch27 is cumulative for patches 24, 25, 26 and the new homepage block-editor stage. You can apply patch27 directly without applying patch24, patch25 or patch26 separately.

## Includes prior recent fixes

- Profile image upload fix for jeweller/dealer logos and dealer covers.
- Retail showroom route and Retail Mode URL support.
- Expanded FAQ.
- Retail links in navigation/footer/sitemap.
- Mobile marketplace 2-column grid.
- Stone card accessibility and image alt text improvements.
- Site settings database foundation and admin Theme tab.

## New in patch27: modular homepage block engine

- Expanded `SiteThemeSettings` with `homepage_layout`.
- Added typed block definitions:
  - `hero`
  - `cert_labs`
  - `trust_strip`
  - `audience_cards`
  - `featured_stones`
  - `matched_pairs`
  - `featured_vendors`
  - `founder_quote`
  - `stats`
- Homepage now renders sections by looping over the saved `homepage_layout` array.
- Admin Theme tab now lets admins:
  - toggle homepage blocks on/off
  - move homepage blocks up/down
  - reset the block order
- Added a second migration that adds `homepage_layout` to existing active site configuration rows if patch26 was already applied.

## Database

- Includes `20260606120000_site_configurations.sql`.
- Includes `20260606123000_homepage_layout_blocks.sql`.
- If patch26 was not applied, the first migration creates the table with layout defaults.
- If patch26 was already applied, the second migration backfills `homepage_layout`.

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

## After copying

Run your Supabase migrations, then build:

```bash
npm run build
```

I could not run a full build in this extracted patch workspace.
