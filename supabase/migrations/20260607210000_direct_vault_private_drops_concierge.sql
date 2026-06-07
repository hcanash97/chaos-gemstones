-- Patch 59: Direct Vault/private drops and concierge request hardening.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stone_source_type') THEN
    CREATE TYPE public.stone_source_type AS ENUM ('standard', 'direct_vault');
  END IF;
END $$;

ALTER TABLE public.stones
  ADD COLUMN IF NOT EXISTS source_type public.stone_source_type NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS private_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS stones_source_type_idx
  ON public.stones (source_type, status, created_at DESC);

CREATE INDEX IF NOT EXISTS stones_private_until_idx
  ON public.stones (private_until)
  WHERE private_until IS NOT NULL;

DROP POLICY IF EXISTS "public read available stones" ON public.stones;

CREATE POLICY "public read available stones"
  ON public.stones
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'available'
    AND (
      private_until IS NULL
      OR private_until < now()
      OR EXISTS (
        SELECT 1
        FROM public.feed_selections fs
        JOIN public.api_keys ak ON ak.id = fs.api_key_id
        WHERE ak.jeweller_id = auth.uid()
          AND ak.is_active = true
          AND fs.selection_type = 'dealer_follow'
          AND fs.dealer_id = stones.dealer_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.dealer_follows df
        WHERE df.jeweller_id = auth.uid()
          AND df.dealer_id = stones.dealer_id
      )
    )
  );

ALTER TABLE public.stone_requests
  ADD COLUMN IF NOT EXISTS treatment_preference TEXT,
  ADD COLUMN IF NOT EXISTS budget_usd_max NUMERIC;

UPDATE public.stone_requests
SET treatment_preference = treatment
WHERE treatment_preference IS NULL
  AND treatment IS NOT NULL;

UPDATE public.stone_requests
SET budget_usd_max = max_budget_usd
WHERE budget_usd_max IS NULL
  AND max_budget_usd IS NOT NULL;

ALTER TABLE public.stone_requests
  DROP CONSTRAINT IF EXISTS stone_requests_status_check;

ALTER TABLE public.stone_requests
  ADD CONSTRAINT stone_requests_status_check
  CHECK (status IN ('open', 'in_progress', 'fulfilled', 'closed'));

DROP POLICY IF EXISTS "admins read all stone requests" ON public.stone_requests;
CREATE POLICY "admins read all stone requests"
  ON public.stone_requests
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins update all stone requests" ON public.stone_requests;
CREATE POLICY "admins update all stone requests"
  ON public.stone_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS stone_requests_admin_created_idx
  ON public.stone_requests (created_at DESC);

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_concierge_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://mngdsxuoujvmhnqzwlnk.functions.supabase.co/notify-concierge',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'request_id', NEW.id,
      'jeweller_id', NEW.jeweller_id,
      'stone_type', NEW.stone_type,
      'shape', NEW.shape,
      'min_carat', NEW.min_carat,
      'max_carat', NEW.max_carat,
      'max_budget_usd', NEW.max_budget_usd,
      'budget_usd_max', NEW.budget_usd_max,
      'treatment', NEW.treatment,
      'treatment_preference', NEW.treatment_preference,
      'notes', NEW.notes
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stone_requests_notify_concierge ON public.stone_requests;

CREATE TRIGGER stone_requests_notify_concierge
  AFTER INSERT ON public.stone_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_concierge_request();

COMMENT ON COLUMN public.stones.source_type IS
  'standard = normal marketplace listing; direct_vault = dealer sourced/private stock signal.';

COMMENT ON COLUMN public.stones.private_until IS
  'If in the future, listing is early-access/private to jewellers following the dealer.';
