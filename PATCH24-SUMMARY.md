# Patch 24 Summary

## Profile image upload fix

- Fixed jeweller logo, dealer logo and dealer cover uploads by changing the Supabase storage path to match the existing storage policy.
- Old path format: `jeweller-logos/user-id-timestamp.jpg`
- New path format: `user-id/jeweller-logos/timestamp.jpg`
- Added image-only validation and a 5MB limit before upload.
- Added clearer success/error toasts and useful alt text for uploaded logos and covers.

## Retail showroom foundation

- Added a new public `/retail` page for a Chaos-owned retail gemstone showroom.
- The page positions retail as an enquiry-led workflow: client browsing, Stone Passport or quote, dealer availability confirmation, then payment/fulfilment later.
- Updated Retail Mode so `/marketplace?retail=1` automatically enables the client-facing marketplace view.
- Added Retail to the main navigation, footer and sitemap.

## FAQ expansion

- Expanded the FAQ to cover profile media, WhatsApp intake, duplicate-safe API sync logic, diagnostics warnings, account/profile editing, Retail Showroom, markups, quote privacy, payment/shipping status, mobile support and Instagram.
- Added a Retail Showroom CTA to the FAQ hero.

## Files included

- `src/routes/dashboard.account.tsx`
- `src/hooks/useRetailMode.ts`
- `src/routes/retail.tsx`
- `src/routes/faq.tsx`
- `src/components/site/SiteHeader.tsx`
- `src/routes/sitemap[.]xml.ts`

## After copying

Run your normal build in the real repo so TanStack Router regenerates the route tree for the new `/retail` route.
