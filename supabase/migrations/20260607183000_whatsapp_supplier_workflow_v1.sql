-- WhatsApp-first supplier workflow v1
-- Adds lightweight metadata for dealers who trade mainly through WhatsApp
-- and lets jeweller sourcing requests signal that WhatsApp/off-platform stock is welcome.

ALTER TABLE public.dealer_profiles
  ADD COLUMN IF NOT EXISTS whatsapp_first boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS supplier_services text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS supplier_note text;

ALTER TABLE public.stone_requests
  ADD COLUMN IF NOT EXISTS allow_whatsapp_sourcing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_response_channel text NOT NULL DEFAULT 'chaos',
  ADD COLUMN IF NOT EXISTS sourcing_stage text NOT NULL DEFAULT 'cut';

ALTER TABLE public.stone_requests
  DROP CONSTRAINT IF EXISTS stone_requests_preferred_response_channel_check;

ALTER TABLE public.stone_requests
  ADD CONSTRAINT stone_requests_preferred_response_channel_check
  CHECK (preferred_response_channel IN ('chaos', 'whatsapp_ok', 'whatsapp_preferred'));

ALTER TABLE public.stone_requests
  DROP CONSTRAINT IF EXISTS stone_requests_sourcing_stage_check;

ALTER TABLE public.stone_requests
  ADD CONSTRAINT stone_requests_sourcing_stage_check
  CHECK (sourcing_stage IN ('rough', 'cut', 'polished', 'cutting_service', 'any'));

CREATE INDEX IF NOT EXISTS dealer_profiles_whatsapp_first_idx
  ON public.dealer_profiles (whatsapp_first)
  WHERE whatsapp_first = true;

CREATE INDEX IF NOT EXISTS stone_requests_whatsapp_sourcing_idx
  ON public.stone_requests (allow_whatsapp_sourcing, created_at DESC)
  WHERE status = 'open';

COMMENT ON COLUMN public.dealer_profiles.whatsapp_first IS
  'True when this supplier primarily trades by WhatsApp and may need assisted intake/review workflows.';

COMMENT ON COLUMN public.dealer_profiles.supplier_services IS
  'Capabilities such as rough supply, cut stones, cutting/polishing, recutting, parcels, WhatsApp-only stock.';

COMMENT ON COLUMN public.stone_requests.allow_whatsapp_sourcing IS
  'True when the jeweller is happy for Chaos/dealers to source from WhatsApp-first suppliers and confirm availability manually.';

NOTIFY pgrst, 'reload schema';
