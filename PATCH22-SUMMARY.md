# Patch 22 Summary

## SEO foundations

- Added `/robots.txt` with sitemap discovery and crawler exclusions for dashboard/admin/API/private surfaces.
- Added crawlable SEO collection pages under `/marketplace/$slug`.
- Added 10 first-pass marketplace SEO collections:
  - wholesale gemstones for jewellers
  - lab-grown diamonds
  - natural diamonds
  - green diamonds
  - sapphires
  - rubies
  - emeralds
  - emerald cut diamonds
  - oval sapphires
  - gemstone inventory API for dealers
- Added shared SEO collection config in `src/lib/seo-marketplace.ts`.
- Added collection pages to `sitemap.xml`.
- Added internal "Popular marketplace searches" links on the main Marketplace page.
- Added CollectionPage JSON-LD to the new SEO landing route.

## WhatsApp workflow

- Expanded the dealer WhatsApp intake page beyond parsing.
- Added a 3-step workflow: request stock, parse draft, review/publish.
- Added a copyable WhatsApp request template dealers can send to suppliers.
- Added an automation roadmap section for the future Twilio/Meta WhatsApp Business flow:
  - inbox
  - media storage
  - AI/OCR review
  - approval before publish

## Notes

- The SEO landing pages are intentionally lightweight and crawlable. They point users into the live marketplace with pre-filled filters.
- The new routes require TanStack route generation during the real app build.
