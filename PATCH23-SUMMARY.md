# Patch 23 Summary

## Account and admin profile editing

- Added editable core account settings on `/dashboard/account`:
  - full name
  - company name
  - city
  - country / region
  - website
  - phone
- Added a guarded server function for users to update their own account settings.
- Added admin dealer profile editing on `/admin/dealer/$id`:
  - full name
  - company
  - email
  - city
  - country / region
  - phone
  - website
  - vendor slug
  - Instagram URL
  - tagline
  - dealer story
  - founded year
- Added a quick action to set dealer location to Surat, India for cases like Nancy Diamonds being incorrectly set to Europe.
- Added an admin "Request profile correction" tool that prepares a clear email for dealers to fix their own details.

## Diagnostics polish

- Restyled the dealer API Sync Diagnostics log.
- Replaced the black terminal-style block with a softer dashboard card layout.
- Added event/severity badges for running, total events, errors, warnings, and saved events.
- Added readable per-event cards with raw value display where available.

## FAQ and social

- Added `/faq` with FAQPage structured data.
- Added FAQ link to the main navigation and footer.
- Added Instagram link for `@chaosgemstonemarket` in the FAQ and footer.
- Added `/faq` to the sitemap.

## AI assistant note

- No live AI chat was added in this patch. The safer first step is FAQ/help content, then later an AI assistant can be added with usage limits, source-grounding, and cost controls.
