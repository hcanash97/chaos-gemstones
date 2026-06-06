# Patch 21 Summary

## Product improvements

- Added a first-version WhatsApp intake workspace for dealers at `/dashboard/dealer/whatsapp`.
- Added "WhatsApp Intake" to the dealer dashboard navigation.
- Added a Stone Passport / Client Quote dialog for jewellers.
- Added quote actions on stone detail pages and wishlist cards.
- Added Retail Mode on the marketplace and stone detail pages.
- Retail Mode hides wholesale pricing and dealer location signals while browsing client-facing.
- Improved empty states for:
  - dealer inventory with links to manual listing, WhatsApp intake, and API sync
  - filtered marketplace no-results with clearer next actions
  - pending approval with a clearer explanation of what happens next

## Implementation notes

- WhatsApp intake is intentionally human-reviewed. It parses pasted dealer messages into draft fields but does not auto-publish listings.
- Client Quote uses a suggested 2.2x wholesale default where wholesale price exists, but jewellers can override the client price before copying or sharing.
- Retail Mode is stored locally in the browser, so it persists for the jeweller on that device.
- No new database tables are required for this first version.
