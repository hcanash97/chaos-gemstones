
-- 1. key_type on api_keys
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS key_type text NOT NULL DEFAULT 'read'
    CHECK (key_type IN ('read', 'write'));

CREATE INDEX IF NOT EXISTS api_keys_owner_type_idx
  ON public.api_keys (jeweller_id, key_type, is_active);

-- 2. Allow approved dealers to manage their own write keys.
-- We reuse the jeweller_id column as the owner column for write keys.
DROP POLICY IF EXISTS "approved dealers create own write keys" ON public.api_keys;
CREATE POLICY "approved dealers create own write keys"
  ON public.api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = jeweller_id
    AND key_type = 'write'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.account_type = 'dealer'
        AND p.is_approved = true
    )
  );

-- (existing jeweller read/update/delete policies already cover both since they
--  scope on jeweller_id = auth.uid())

-- 3. dealer_profiles: add auto-sync fields
ALTER TABLE public.dealer_profiles
  ADD COLUMN IF NOT EXISTS auto_sync_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- 4. sync_logs table
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  source text NOT NULL DEFAULT 'manual',
  stones_added integer NOT NULL DEFAULT 0,
  stones_updated integer NOT NULL DEFAULT 0,
  stones_marked_inactive integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_logs TO authenticated;
GRANT ALL ON public.sync_logs TO service_role;

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dealers read own sync logs"
  ON public.sync_logs FOR SELECT TO authenticated
  USING (auth.uid() = dealer_id);

CREATE POLICY "dealers insert own sync logs"
  ON public.sync_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = dealer_id);

CREATE INDEX IF NOT EXISTS sync_logs_dealer_created_idx
  ON public.sync_logs (dealer_id, created_at DESC);
