
ALTER TABLE public.dealer_profiles ADD COLUMN IF NOT EXISTS directory_url text;

ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS minimum_order_qty integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bulk_pricing_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes_for_buyers text;
