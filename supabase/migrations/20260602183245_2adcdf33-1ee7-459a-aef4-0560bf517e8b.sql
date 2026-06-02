ALTER TABLE public.dealer_profiles
  ADD COLUMN IF NOT EXISTS trade_memberships text[] DEFAULT '{}'::text[];