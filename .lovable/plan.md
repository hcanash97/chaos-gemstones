# Comprehensive Marketplace Filter Rebuild

A large, multi-part change. I'll ship it in 5 phases so each piece is reviewable.

## Phase 1 — Database migration

Add ~25 columns to `stones`:

- Colour: `colour_hue`, `colour_tone`, `colour_saturation`, `fluorescence_colour`
- Measurements: `measurements_length/width/height`, `lw_ratio`, `depth_pct`, `table_pct`
- Finish: `girdle`, `culet_size`, `culet_condition`
- Inclusions: `shade`, `milky`, `eye_clean`, `black_inclusion`, `enhancement`
- Coloured-stone: `phenomenon`, `matching_pair`
- Media flags: `has_video`, `has_360`
- Trade: `provenance_report`, `listing_type` (`single`|`parcel`, default `single`), `parcel_quantity`

Add `saved_searches` table for jewellers:
- `id`, `jeweller_id`, `name`, `filters` (jsonb), `notify_daily` (bool), `last_notified_at`, `created_at`
- RLS: jewellers manage their own; service_role for digest job.

## Phase 2 — Marketplace filter UI (`/marketplace`)

Replace current sidebar entirely. Build composable filter primitives:

- Collapsible section component (header + +/− toggle, persisted open state).
- Active-filter chips bar above results.
- Universal sections: Stone Type, Shape (icon grid), Carat (slider + preset pills), Price (slider + pills + per-stone/per-carat toggle), Origin (Natural/Lab/Both), Cert Lab, Cert Number, Country of Origin, Availability, Listing Type, Bulk pricing, Dealer, New listings.
- Diamond-only sections (conditional on diamond selection): Colour (D–Z), Fancy Colour (hue + intensity + treated toggle), Clarity, Cut, Polish, Symmetry, Fluorescence (intensity + colour), Measurements, Depth %, Table %, Girdle, Culet, Shade, Milky, Eye Clean, Black Inclusion, Enhancement, Media, Provenance.
- Coloured-stone sections (conditional): Primary Colour (context-aware swatch grid per stone type), Tone, Saturation, Treatment (with unheated-premium note), Clarity Type, Phenomenon, Premium origins toggle, Matching pairs, Parcel.
- Results header: count, Sort dropdown (Newest / Price asc/desc / Carat / Most viewed / Updated), Grid/List view toggle.
- Mobile: existing Sheet drawer reused.
- Save Search button (jeweller only) → dialog → POST to `saved_searches`.

Filter state lives in a single `useReducer` keyed object so URL sync + chips + saving are trivial.

## Phase 3 — Dealer stone form

Expand `StoneForm.tsx` with the new fields, grouped:
Identity • Gemological Grades • Colour • Clarity & Inclusions • Measurements • Certification • Commercial • Media. Keep existing UX; add fields only.

## Phase 4 — Stone detail page

Update `/stone/$id` spec table to render all new fields, hiding empty rows. Group under the same section headers as the form.

## Phase 5 — Saved searches (jeweller)

- New route `/dashboard/jeweller/saved-searches` listing saved searches with run/delete actions.
- Server route `/api/public/cron/saved-search-digest` (signed) iterates saved searches, finds new stones since `last_notified_at`, emails the jeweller, updates timestamp. Reuses existing Resend setup. (User schedules pg_cron separately, same pattern as existing digest.)

## Technical notes

- New columns are all nullable / have safe defaults — no backfill needed.
- Filter logic stays client-side over the existing `stones` query (already capped at 500); if listings grow, we'll move to server-side filtering later.
- "Most viewed" sort needs a view counter — I'll add a `view_count` column + RPC increment in Phase 1 and wire incrementing on `/stone/$id`.
- Fancy-colour vs white-colour are mutually exclusive in the UI (toggle swaps the pill grid).
- Coloured-stone primary-colour swatches are driven by a config map keyed by stone type, with a generic hue/tone/saturation fallback.

## What I'd like to confirm before starting

1. **Saved-search email digest**: OK to add a new public cron endpoint + a pg_cron schedule (you'll need to enable it), or do you want me to skip the email side and just save/recall searches for now?
2. **View counter** for "Most viewed" sort — add it, or drop that sort option?
3. **URL sync** of filter state (shareable filtered links) — nice-to-have, want it included?

Once you answer (or say "all yes, proceed"), I'll start with the migration and work straight through phases 1–5.