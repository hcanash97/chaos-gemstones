# CHAOS GEMSTONES — Systems SITREP

_Audit date: 2026-06-12. Source of truth: working tree at audit time._

---

## 1. SYSTEM EXECUTIVE STATUS DASHBOARD

| Sub-system | Status | Notes |
|---|---|---|
| Shopify OAuth handshake (server-side, no browser fetch) | **[FULLY FUNCTIONAL]** | All token exchange runs in `createServerFn` + `/api/public/shopify/callback`; browser never talks to Shopify. CORS path eliminated. |
| Shopify sync batching | **[PARTIALLY DEGRADED]** | Implemented as chunks of **10** with a **500 ms** inter-batch pause + 429 retry, not the spec's "25 / 1.5 s leaky bucket". Functional and safe, but does not match the stated target. |
| Shopify payload sanitisers (`cleanPrice`, `cleanImages`, `bodyHtml`) | **[FULLY FUNCTIONAL]** | `cleanPrice` strips `£ $ , whitespace` → `0.00` decimal. `cleanImages` filters to `https://`, sorts primary/order, caps at 10. `bodyHtml` falls back to a "Verified Premium Gemstone" placeholder when `notes_for_buyers` is empty. |
| Shopify metafield types (choice lists) | **[FULLY FUNCTIONAL]** | `mf()` JSON-encodes when `type.startsWith("list.")`; all choice-list metafields explicitly typed. Carat ranges normalised to hyphen-minus. |
| Shopify diagnostics box | **[FULLY FUNCTIONAL]** | `dashboard.jeweller.shopify.tsx` renders translated errors + raw strings, last-sync totals, recent-syncs table with per-row error drill-down. |
| Marketplace filter → page reset | **[FULLY FUNCTIONAL]** | `setPage(1)` fires inside the filter `useEffect` (`marketplace.tsx:137`). Pagination handler also clamps via `Math.min(Math.max(1, nextPage), totalPages)`. |
| Marketplace multi-select → PostgREST `.in()` | **[PARTIALLY DEGRADED]** | Server-side coarse query uses `.in()` on stable enums; nuanced multi-selects (clarity variants, fancy hues, polish, symmetry, fluorescence, etc.) are still **client-side** post-filters in `applyFilters()` (`src/lib/marketplace/filters.ts`). Works, but pages can render under-full when client filters trim the server page. |
| Vendors directory grid | **[PARTIALLY DEGRADED]** | `vendors.index.tsx` uses `dealer_profiles` with `profiles!inner(...)` — vendors with a missing/unapproved profile row silently drop out. Anon SELECT on `dealer_profiles` / `profiles` is required for logged-out browse — confirm policies (see §2). |
| Vendor stone counts | **[FULLY FUNCTIONAL]** but inefficient | Client paginates 1000-row windows over `stones` to count per dealer. Should be a server fn returning aggregated counts. |
| WhatsApp ingestion — multi-stone parsing | **[PARTIALLY DEGRADED]** | Regex extractor in `whatsapp-intake.ts` returns a single `WhatsappParsedDraft`. No Zod-validated multi-block split; Claude/Haiku path in `whatsapp-intake.functions.ts` is single-message. |
| WhatsApp draft default flag | **[BROKEN / ACTION REQUIRED]** | No `is_test`/`status='pending_approval'` default on intake; stones created from drafts inherit the standard `stones.status` default. Disclaimer clause is not auto-appended to text fields. |
| Order platform fee cap | **[PARTIALLY DEGRADED]** | DB trigger: `LEAST(GREATEST(wholesale_price_usd * 0.02, 5), 150)` — a USD $150 cap, not the spec's £50 cap. No automatic disable of card payment over £1,500 / no Open Banking prompt. |
| Storage bucket RLS (`stone-images`, `cert-scans`, `assets`) | **[FULLY FUNCTIONAL]** | Dealer INSERT/UPDATE/DELETE policies on `storage.objects` cover own stone-images and certs; admin policies cover `assets`. Buckets `stone-images` and `assets` are public read by design. |
| State stale-cache (dealer edits → marketplace) | **[PARTIALLY DEGRADED]** | TanStack Query staleTime varies per route (60 s on vendors, default on marketplace). No realtime channel or cross-route invalidation on stone mutations. |
| Database security (RLS, encrypted tokens, definer view) | **[FULLY FUNCTIONAL]** | All scanner findings resolved this turn: `dealer_profiles_public` now `security_invoker=true`, `shopify_connections` columns renamed to `encrypted_*`, restrictive deny policies on `shopify_oauth_states` and `shopify_sync_logs` writes. |

---

## 2. DETAILED REACTION PROFILE

### A. Shopify Bridge
- **Boundary:** No client → Shopify fetch anywhere. Authoritative entry points: `src/lib/shopify.functions.ts` (RPC), `src/lib/shopify.server.ts` (handlers), `src/routes/api/public/shopify/callback.ts` (OAuth return). Confirmed CORS-immune.
- **Batching mismatch:** `src/lib/shopify.server.ts` ~L601-688 — `const CHUNK = 10` and `sleep(500)` between batches. Spec asks for 25 / 1500 ms.
- **Sanitisers:** `cleanPrice` (L282), `cleanImages` (L293), `bodyHtml` (L246) — all behave as specified.
- **Error capture:** Raw Shopify response text appended to `result.errors` (sliced to 300 chars); first 25 errors persisted in `shopify_sync_logs.error_message`.

### B. Marketplace Search & Filters
- **Reset:** `src/routes/marketplace.tsx` L122 `useState(1)`, L137 `setPage(1)` on filter change — correct.
- **Page-offset trap:** Server query returns `PAGE_SIZE=24` rows; client `applyFilters()` then trims. If trimmed count < page index window, the rendered list is short. Mitigation: `totalPages` computed from server count, so the trap is bounded — but client-only filters (fancy hues, polish, symmetry, fluorescence variants, girdle, culet, milky, eye-clean, black-inclusion) can still reduce a 24-row page to 0.
- **`.in()` discipline:** Stable scalar enums (`status`, `listing_type`) use server filters; freeform variants (`clarity_grade`, `colour_grade`) intentionally fall through to client matching because the source data carries dialectal spellings.

### C. Vendors Directory
- **Inner join hazard:** `dealer_profiles` row without an `is_approved=true` profile is invisible. The query is `profiles!inner(...)` (`vendors.index.tsx` L48). Switch to `profiles(...)` (left join) + client filter, or backfill the profile row when a dealer signs up (`handle_new_user()` already does this for new accounts but legacy rows may be missing).
- **Anon read:** `dealer_profiles` and `profiles` policies must include a SELECT scoped to `is_approved = true` for the `anon` role; otherwise the public vendors grid is blank to logged-out visitors. Audit recommended — current policies on `profiles`/`dealer_profiles` need verification against the public-read intent.
- **Counts:** `vendor-stone-counts` paginates 1000 rows at a time client-side. For >5k stones this is wasteful — replace with a `createServerFn` returning `dealer_id, count` aggregated via SQL group-by.

### D. WhatsApp Ingestion
- **Single-stone bias:** `parseStoneMessage()` in `src/lib/whatsapp-intake.ts` runs regex over the whole body. Multi-stone messages collapse into one draft. Need: split by paragraph/line + Zod array parse on the LLM path in `whatsapp-intake.functions.ts`.
- **Safety default:** No write path enforces `status='pending_approval'` or an equivalent unverified flag. The stones table has no `is_test` column. A new column or status enum value is needed before WhatsApp drafts can land as "unverified".
- **Disclaimer:** No platform availability disclaimer is appended to draft text fields.

### 2.1 Architectural Health
- **Fees:** trigger in `supabase/migrations/20260528195842_*.sql` enforces 2% USD min $5 max **$150**. No code or UI gate restricts payment provider over £1,500. Open Banking integration is not present in the repo.
- **Storage policies:** verified — dealer-scoped INSERT/UPDATE/DELETE on `stone-images` and `cert-scans` exist, admin overrides on `assets`. No 403 risk for dealer uploads as long as the storage path prefix encodes the dealer id (the existing policies assume this).
- **Stale cache:** dealer edits invalidate the dealer's own `useQuery` keys but no cross-key invalidation reaches the marketplace grid. Stones are re-fetched only when the marketplace component remounts or its `staleTime` expires. No Supabase realtime subscription on `stones` changes.
- **Vendor count query** (above) is the single biggest performance hotspot found.

---

## 3. ACTIONABLE UPGRADE ROADMAP

1. **Shopify batch tuning** — change `CHUNK` to 25 and `sleep(500)` to `sleep(1500)` in `src/lib/shopify.server.ts` if the spec value is authoritative. (Current 10/500 ms is also valid; pick one.)
2. **Marketplace server-side filters** — push the high-cardinality multi-selects (clarity, colour grade, polish, symmetry, fluorescence, girdle, culet, milky, eye-clean, black-inclusion) into the server query in `marketplace.functions.ts` using `.in()` or `.or()`. Eliminates the under-full page artefact.
3. **Vendors directory** —
   - Replace `profiles!inner(...)` with `profiles(...)` and filter `v.profiles?.is_approved` client-side, OR run a backfill migration ensuring every `dealer_profiles.id` has a matching `profiles` row.
   - Verify (and if missing, add) `GRANT SELECT ON public.dealer_profiles, public.profiles TO anon` with policies `USING (is_approved = true)` for public browse.
   - Add `getVendorStoneCounts()` server function (aggregate group-by) and replace the 1000-row paginator.
4. **WhatsApp pipeline** —
   - Add `WhatsappParsedDraftArraySchema = z.array(WhatsappParsedDraft)` in `whatsapp-intake.functions.ts`; ask Claude/Haiku for `stones[]` per message.
   - Migration: add `status='pending_approval'` to the stones status enum (or a `is_unverified boolean DEFAULT false`); set it on WhatsApp inserts.
   - Append the platform disclaimer constant into `notes_for_buyers` when a WhatsApp draft is converted to a stone.
5. **Fees & payments** —
   - If the £50 cap is authoritative, update the trigger to `LEAST(GREATEST(price_gbp * 0.02, 2), 50)` and the UI label in `dashboard.jeweller.orders.tsx` accordingly.
   - Add a checkout-side check: if order total ≥ £1,500, hide the card payment component and surface a "Pay by Bank Transfer / Open Banking" CTA (new component, no provider wired yet).
6. **Realtime / cache propagation** — wire `supabase.channel('public:stones')` subscription on the marketplace component to call `queryClient.invalidateQueries({ queryKey: ['stones'] })` on `UPDATE`/`INSERT`/`DELETE`. Same for `dealer_profiles` on vendors page.
7. **Storage path enforcement** — add a server function gateway for uploads instead of relying on storage RLS path-prefix assumptions, so any future bucket rename does not silently break dealer uploads.
8. **Operational telemetry** — extend `shopify_sync_logs` with per-stone JSONB error array (already partly captured) and surface a CSV export in the diagnostics box.

---

_End of SITREP._