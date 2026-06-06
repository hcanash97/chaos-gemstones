# Patch 26 Summary

## Site settings database

- Added a new Supabase migration for `public.site_configurations`.
- Columns:
  - `id uuid primary key default gen_random_uuid()`
  - `is_active boolean not null default true`
  - `theme_data jsonb not null`
- `theme_data` defaults to:
  - `logo_url`
  - `accent_color`
  - `hero_title`
  - `hero_subtitle`
  - `contact_whatsapp`
- Added RLS:
  - anonymous and authenticated users can read active configurations
  - only authenticated admins can insert/update configurations
  - no public write access
- Seeds one active default row if none exists.

## TypeScript settings model

- Added `src/lib/site-theme.ts`.
- Exports:
  - `SiteThemeSettings`
  - `SiteConfigurationRow`
  - `DEFAULT_SITE_THEME`
  - `normalizeSiteTheme`
  - `isHexColor`
- Updated Supabase generated type map with the `site_configurations` table.

## Admin customiser panel

- Added a new `Theme` tab in the admin dashboard.
- Admins can edit:
  - homepage headline
  - homepage subtitle
  - accent colour with a native colour picker
  - WhatsApp contact number
  - logo URL
- Added a logo file upload target using the existing `stone-images` bucket and policy-safe path format.
- Added save/loading states, success/error toasts, reset-to-defaults, and a live preview card.

## Homepage dynamic hydration

- Homepage now fetches the active `site_configurations` row.
- Hero title, subtitle, logo, accent colour and WhatsApp button render from database settings.
- Falls back to default Chaos copy/colour if the config is missing or still loading.

## Not included yet

- The full Shopify-style modular block engine is intentionally not included in this patch.
- Next stage would add `homepage_layout` blocks like hero, WhatsApp CTA, featured stones, featured vendors, and let admins toggle/reorder them.

## Files included

- `src/routes/admin.tsx`
- `src/routes/index.tsx`
- `src/lib/site-theme.ts`
- `src/integrations/supabase/types.ts`
- `supabase/migrations/20260606120000_site_configurations.sql`

## After copying

Run the Supabase migration and then your normal build in the real repo:

```bash
npm run build
```
