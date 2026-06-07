
-- Missing columns on stones, referenced by dealer-sync.server.ts and whatsapp-intake.functions.ts
ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS external_sync_key text,
  ADD COLUMN IF NOT EXISTS source_stock_no  text,
  ADD COLUMN IF NOT EXISTS intake_source    text;

CREATE INDEX IF NOT EXISTS stones_external_sync_key_idx
  ON public.stones(dealer_id, external_sync_key)
  WHERE external_sync_key IS NOT NULL;

-- WhatsApp intake audit log
CREATE TABLE IF NOT EXISTS public.whatsapp_intake_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL,
  stone_id uuid,
  raw_message text NOT NULL,
  extracted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence text NOT NULL DEFAULT 'medium',
  warnings text[] NOT NULL DEFAULT '{}',
  raw_price_text text,
  original_currency text,
  status text NOT NULL DEFAULT 'saved',
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_intake_log TO authenticated;
GRANT ALL ON public.whatsapp_intake_log TO service_role;

ALTER TABLE public.whatsapp_intake_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dealers manage own intake log"
  ON public.whatsapp_intake_log
  FOR ALL TO authenticated
  USING (auth.uid() = dealer_id)
  WITH CHECK (auth.uid() = dealer_id);

CREATE POLICY "admins manage all intake log"
  ON public.whatsapp_intake_log
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
