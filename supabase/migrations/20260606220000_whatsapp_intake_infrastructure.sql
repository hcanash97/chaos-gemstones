-- ============================================================
-- WhatsApp Intake Infrastructure
-- Adds:
--   1. intake_source column on stones
--   2. whatsapp_intake_log table (raw message audit trail)
--   3. approved_whatsapp_numbers table (dealer phone whitelist)
-- ============================================================

-- 1. intake_source column on stones
ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS intake_source text
    DEFAULT 'manual'
    CHECK (intake_source IN ('manual', 'csv', 'api_feed', 'whatsapp'));

COMMENT ON COLUMN public.stones.intake_source IS
  'Channel through which the stone was created: manual form, CSV import, dealer API feed, or WhatsApp intake.';

-- 2. Raw message audit log — every message ever processed
CREATE TABLE IF NOT EXISTS public.whatsapp_intake_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  raw_message      text NOT NULL,
  phone_number     text,                          -- sender phone (Phase 2: Twilio)
  twilio_message_sid text,                        -- Twilio SID for idempotency (Phase 2)
  extracted_json   jsonb,                         -- full AI response payload
  confidence       text CHECK (confidence IN ('high', 'medium', 'low')),
  warnings         text[],                        -- AI-generated warnings
  raw_price_text   text,
  original_currency text,
  stone_id         uuid REFERENCES public.stones(id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'saved', 'approved', 'rejected', 'duplicate', 'error')),
  error_message    text,
  processed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.whatsapp_intake_log IS
  'Immutable audit trail of every WhatsApp message processed through intake. Linked to the stone created from it.';

CREATE INDEX IF NOT EXISTS whatsapp_intake_log_dealer_id_idx
  ON public.whatsapp_intake_log (dealer_id);
CREATE INDEX IF NOT EXISTS whatsapp_intake_log_stone_id_idx
  ON public.whatsapp_intake_log (stone_id);
CREATE INDEX IF NOT EXISTS whatsapp_intake_log_status_idx
  ON public.whatsapp_intake_log (status);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_intake_log_twilio_sid_unique
  ON public.whatsapp_intake_log (twilio_message_sid)
  WHERE twilio_message_sid IS NOT NULL;

-- 3. Approved dealer phone numbers (whitelist for Phase 2 automation)
CREATE TABLE IF NOT EXISTS public.approved_whatsapp_numbers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number text NOT NULL,                     -- E.164 format: +447911123456
  label        text,                              -- human label e.g. "Nancy - personal"
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone_number)
);

COMMENT ON TABLE public.approved_whatsapp_numbers IS
  'Whitelisted phone numbers allowed to submit stones via WhatsApp. Unknown numbers are auto-rejected.';

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.whatsapp_intake_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_whatsapp_numbers ENABLE ROW LEVEL SECURITY;

-- Dealers can read their own intake logs
CREATE POLICY "intake_log_dealer_read" ON public.whatsapp_intake_log
  FOR SELECT USING (dealer_id = auth.uid());

-- Dealers can insert their own intake logs
CREATE POLICY "intake_log_dealer_insert" ON public.whatsapp_intake_log
  FOR INSERT WITH CHECK (dealer_id = auth.uid());

-- Admins can read/update all logs
CREATE POLICY "intake_log_admin_all" ON public.whatsapp_intake_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND account_type = 'admin'
    )
  );

-- Dealers can manage their own phone numbers
CREATE POLICY "whatsapp_numbers_dealer_own" ON public.approved_whatsapp_numbers
  FOR ALL USING (dealer_id = auth.uid())
  WITH CHECK (dealer_id = auth.uid());

-- Admins can manage all
CREATE POLICY "whatsapp_numbers_admin_all" ON public.approved_whatsapp_numbers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND account_type = 'admin'
    )
  );

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
