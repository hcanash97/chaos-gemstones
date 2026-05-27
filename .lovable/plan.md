
# CHAOS — Foundation Build

Scope: auth + full DB schema + RLS + storage + public browse pages. Dealer/jeweller dashboards, CSV import, API feed, enquiries, and admin tooling come in later phases.

## 1. Enable Lovable Cloud
Provision backend (Postgres, Auth, Storage, Edge Functions).

## 2. Database schema (one migration)
All tables from the brief:
- `profiles` (linked to `auth.users`, `account_type` enum dealer/jeweller/admin, `is_approved` default false)
- `dealer_profiles` (slug, bio, specialities[], languages[], featured, etc.)
- `jeweller_profiles` (markup_global)
- `stones` (all gemological + commercial fields, status enum)
- `stone_images`
- `api_keys`, `feed_selections` (created now, used in later phase)
- `enquiries`, `enquiry_messages` (created now, used in later phase)
- `user_roles` table + `app_role` enum + `has_role()` security-definer function (admin role separation, per security rules — admin is NOT stored on profiles)
- Trigger `handle_new_user()` to auto-create a `profiles` row on signup with `is_approved = false`
- Explicit `GRANT`s on every public table; `anon` SELECT only on `stones` (available), `dealer_profiles`, and the public view of `profiles` needed for vendor cards

## 3. RLS policies
- `profiles`: user reads own row; admin reads all via `has_role`
- `stones`: public reads where `status = 'available'`; dealers full CRUD on own; admin all
- `stone_images`: public read for images of available stones; dealer manage own
- `dealer_profiles`: public read; owner update
- `jeweller_profiles`, `api_keys`, `feed_selections`: owner-only
- `enquiries` / `enquiry_messages`: participants only

## 4. Storage buckets
- `stone-images` (public)
- `cert-scans` (private)
- Upload policies restricted to authenticated dealers

## 5. Auth
- Email/password + Google sign-in
- Signup forms at `/sign-up/dealer` and `/sign-up/jeweller` set `account_type` accordingly
- **Approval gate**: login succeeds but if `is_approved = false`, user is redirected to a `/pending-approval` page; dashboards blocked by route guard
- `/login`, password reset page

## 6. Public pages
- `/` — hero, two-sided explainer, featured vendors, featured stones, dual CTAs
- `/marketplace` — stone grid with basic filters (stone type, shape, carat range, price range, natural/lab, cert lab) and sort; reads from `stones` where available
- `/vendors` — dealer directory with search
- `/vendors/[slug]` — vendor profile + their available catalogue
- `/stone/[id]` — image gallery, full spec table, vendor card, "Enquire" CTA (CTA disabled with tooltip "Coming soon" this phase)
- `/about`

## 7. Design
Dark navy / deep teal primary, gold accent (#C9A84C), serif headings (e.g. Cormorant/Playfair) + sans body (Inter), restrained motion, data-dense but clean. Tokens in `index.css` + `tailwind.config.ts`. Mobile responsive.

## 8. Seed data
Insert ~6 sample dealers and ~30 sample stones (mixed diamonds + coloured) so the marketplace, vendor pages, and homepage have content immediately.

## Out of scope this phase
Dealer/jeweller/admin dashboards, CSV import, API feed edge function, enquiries flow, markup tool, admin approval UI (approval will be done via the Cloud table editor for now — I'll note this for the user).

## Technical notes
- Stack: React + TS + Tailwind + shadcn (Lovable defaults) + Lovable Cloud
- Single initial migration creates all tables so later phases don't need schema changes
- Edge functions (`feed`, `process-csv`) are deferred to phase 2
- Filtering on `/marketplace` is client-side over a paginated server query for MVP simplicity
