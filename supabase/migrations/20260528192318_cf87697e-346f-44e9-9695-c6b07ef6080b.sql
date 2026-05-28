
ALTER TABLE public.dealer_profiles ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE public.jeweller_profiles ADD COLUMN IF NOT EXISTS display_currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE public.jeweller_profiles ADD COLUMN IF NOT EXISTS feed_currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE public.stones ADD COLUMN IF NOT EXISTS price_currency TEXT NOT NULL DEFAULT 'USD';
