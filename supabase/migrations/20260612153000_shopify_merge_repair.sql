-- Shopify merge repair.
-- Aligns the database with the encrypted Shopify token fields used by the app.
-- Safe to run repeatedly.

ALTER TABLE public.shopify_connections
  ADD COLUMN IF NOT EXISTS encrypted_access_token text,
  ADD COLUMN IF NOT EXISTS encrypted_client_secret text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shopify_connections'
      AND column_name = 'access_token'
  ) THEN
    EXECUTE '
      UPDATE public.shopify_connections
      SET encrypted_access_token = access_token
      WHERE encrypted_access_token IS NULL
        AND access_token IS NOT NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shopify_connections'
      AND column_name = 'client_secret'
  ) THEN
    EXECUTE '
      UPDATE public.shopify_connections
      SET encrypted_client_secret = client_secret
      WHERE encrypted_client_secret IS NULL
        AND client_secret IS NOT NULL
    ';
  END IF;
END $$;

ALTER TABLE public.shopify_sync_logs
  ADD COLUMN IF NOT EXISTS sync_session_id uuid,
  ADD COLUMN IF NOT EXISTS triggered_by text DEFAULT 'manual_btn',
  ADD COLUMN IF NOT EXISTS total_stones_detected integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stones_added_successfully integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stones_updated_successfully integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stones_failed_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_manifest jsonb DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shopify_sync_logs'
      AND column_name = 'stones_added'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shopify_sync_logs'
      AND column_name = 'stones_added_legacy'
  ) THEN
    ALTER TABLE public.shopify_sync_logs RENAME COLUMN stones_added TO stones_added_legacy;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shopify_sync_logs'
      AND column_name = 'stones_updated'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shopify_sync_logs'
      AND column_name = 'stones_updated_legacy'
  ) THEN
    ALTER TABLE public.shopify_sync_logs RENAME COLUMN stones_updated TO stones_updated_legacy;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shopify_sync_logs'
      AND column_name = 'stones_archived'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'shopify_sync_logs'
      AND column_name = 'stones_archived_legacy'
  ) THEN
    ALTER TABLE public.shopify_sync_logs RENAME COLUMN stones_archived TO stones_archived_legacy;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shopify_sync_logs_jeweller_started
  ON public.shopify_sync_logs(jeweller_id, started_at DESC);

NOTIFY pgrst, 'reload schema';
