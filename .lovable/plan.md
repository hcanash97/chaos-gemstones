# Plan: Dealer Retention, Jeweller Orders, Fee Tracking, SEO Content, Referral Nudges

Five workstreams, applied in order. Three migrations bundled up front, then code.

## 1. Database migrations (3 separate `supabase--migration` calls)

**M1 — `pricing_rules` table**
- `id`, `dealer_id` (FK → profiles, cascade), `scope` ('catalogue' | 'stone_type' | 'stone'), `stone_id` (nullable FK), `stone_type` (nullable), `rule_type` ('min_price' | 'min_margin_pct' | 'rap_floor'), `value` numeric, `currency` default 'USD', `notes`, `is_active`, `created_at`.
- GRANTs to authenticated + service_role, RLS, single ALL policy `dealer_id = auth.uid()`.

**M2 — orders shipping/tracking fields**
- `jeweller_notes`, `shipping_status` default 'pending', `tracking_number`, `carrier`, `expected_delivery` date, `received_at` timestamptz, `jeweller_confirmed_receipt` bool default false.
- RLS policy gap: `orders` currently has no UPDATE policy. Add `dealers update own orders` (tracking fields) and `jewellers update own orders` (receipt confirmation + jeweller_notes). Without these the new UI is read-only.

**M3 — orders fee fields + auto-calc trigger**
- `platform_fee_usd`, `platform_fee_currency` default 'GBP', `platform_fee_amount`, `fee_invoiced_at`, `fee_paid_at`.
- Trigger `on_order_receipt_confirmed`: when `jeweller_confirmed_receipt` flips false→true, compute `platform_fee_usd = LEAST(GREATEST(wholesale_price_usd * 0.02, 5), 150)` if null. Also fire `notify_email_event('order_received_dealer', NEW.id)`.
- Add trigger on tracking-number set: fire `notify_email_event('order_shipped_jeweller', NEW.id)` when `tracking_number` transitions from null to non-null.

## 2. Pricing rules (dealer side)

- New route `src/routes/dashboard.dealer.pricing.tsx`:
  - List of rules with scope chip, type, value, active toggle, delete.
  - "Add rule" dialog with: scope select → conditional stone picker (queries dealer's own stones) or stone_type select; rule_type select; value input; notes.
- `StoneForm.tsx`: after load, fetch active rules for this dealer and show inline warning if current wholesale violates any rule (min_price, min_margin_pct vs declared cost — note: no cost field exists, so margin rule will need a "declared reference price" input on the rule itself; treat margin as wholesale-vs-rule.value reference and document the limitation in the rule's notes hint).
- Add nav entry in dealer dashboard sidebar.

**Feed enforcement (`src/routes/api/public/feed.ts`):**
- After resolving stones, load active pricing rules for each unique `dealer_id` in the result set (single query, group in memory).
- For each stone, evaluate applicable rules (catalogue + matching stone_type + matching stone_id). If `wholesale_price_usd` violates a `min_price` or `rap_floor` rule, push to `excluded[]` with `{ id, reason: 'below_minimum_price' }` and drop from `stones[]`.
- Change response shape from bare array → `{ stones: [...], excluded: [...] }`. **Breaking change** — update `src/routes/embed.$key.tsx` which currently reads `data.stones` already (good) but expects `count` (will set in response).

## 3. Jeweller order management

- New route `src/routes/dashboard.jeweller.orders.tsx`:
  - Tabs: All / Pending / Shipped / Delivered / Complete (derived from `shipping_status` + `jeweller_confirmed_receipt`).
  - Order cards with stone thumbnail (join `stones` + `stone_images`), dealer name + country (join `profiles`), price in jeweller display currency via `CurrencyContext`, dates, tracking display.
  - "Mark as received" button → updates `jeweller_confirmed_receipt`, `received_at`, `shipping_status='delivered'`.
  - "Add tracking details" dialog (carrier dropdown FedEx/DHL/Malca-Amit/Brinks/Other, tracking, ETA) — writes to same fields.
  - "Open enquiry thread" link → `/dashboard/jeweller/enquiries` filtered to that enquiry_id.
  - Completed orders show fee banner: "Platform fee: £X.XX (2% of £X,XXX)" using converted `platform_fee_usd`.
- Add nav entry in jeweller dashboard.

**Dealer side (`src/routes/dashboard.sales.tsx`):**
- Add inline tracking-entry section to each order row: carrier select, tracking input, expected delivery date, Save button.

**Email templates (`src/lib/email/templates.ts` + `src/routes/api/public/hooks/email/notify.ts`):**
- Add `order_shipped_jeweller` and `order_received_dealer` cases with HTML templates.

## 4. Fee ledger (admin)

- Update fee summary in `src/routes/admin.tsx` to read `platform_fee_usd` directly from confirmed orders.
- New "Fee Ledger" section:
  - This-month accrued (confirmed, `fee_invoiced_at IS NULL`).
  - Invoiced unpaid (`fee_invoiced_at NOT NULL AND fee_paid_at IS NULL`).
  - Paid (`fee_paid_at NOT NULL`).
  - Per-jeweller breakdown table.

## 5. /learn SEO content

Six new route files, each with full `head()` meta (title, description, og:title, og:description, og:type=article, canonical) and JSON-LD `Article` script. Each ≥600 words, h1 matches title, multiple h2 sections, internal links to filtered marketplace, sign-up CTAs top + bottom.

- `src/routes/learn.tsx` — index with cards.
- `src/routes/learn.how-to-source-sapphires-wholesale.tsx`
- `src/routes/learn.diamond-grading-explained.tsx`
- `src/routes/learn.buying-unheated-rubies.tsx`
- `src/routes/learn.gemstone-api-for-jewellers.tsx`
- `src/routes/learn.understand-gemstone-treatments.tsx`
- `src/routes/learn.jaipur-gemstone-market-guide.tsx`

- `SiteHeader.tsx`: add "Resources" dropdown containing About, How it works, Learn.
- `src/routes/sitemap[.]xml.ts`: add all 7 learn URLs.

## 6. Discovery nudges

- `dashboard.jeweller.api.tsx`: after first successful key generation (detect: rows just went 0→1), show Dialog with referral copy + pre-filled message + copy-to-clipboard. Persist "seen" flag in localStorage so it only shows once.
- `dashboard.stones.index.tsx` (dealer): when `rows.length >= 10`, show dismissible banner above the table with vendor profile URL (`/vendors/{slug}`) + copy button. Dismiss persisted in localStorage.

## Technical notes

- All migrations run via `supabase--migration` (one call per migration, sequentially, with confirmation between each — required because types.ts regenerates after approval).
- After migrations applied, update `src/integrations/supabase/types.ts` will refresh automatically.
- Feed response shape change: bump nothing externally, but document in `docs.api.tsx`.
- Run typecheck before finishing.

## Order of execution
1. Migration M1 (pricing_rules) → wait approval
2. Migration M2 (orders shipping + UPDATE policies) → wait approval
3. Migration M3 (orders fee fields + triggers) → wait approval
4. Pricing rules UI + feed enforcement
5. Jeweller orders + dealer tracking entry + email templates
6. Fee ledger in admin
7. /learn pages + nav + sitemap
8. Referral/share nudges
9. Typecheck pass
