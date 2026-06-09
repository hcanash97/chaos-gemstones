-- Upgrade shopify_sync_logs to support detailed per-sync telemetry.
-- Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so it's safe to re-run.

ALTER TABLE public.shopify_sync_logs
  ADD COLUMN IF NOT EXISTS sync_session_id uuid,
  ADD COLUMN IF NOT EXISTS triggered_by text DEFAULT 'manual_btn',
  ADD COLUMN IF NOT EXISTS total_stones_detected integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stones_added_successfully integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stones_updated_successfully integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stones_failed_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_manifest jsonb DEFAULT '[]'::jsonb;

-- Rename legacy columns to new schema if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shopify_sync_logs' AND column_name='stones_added') THEN
    ALTER TABLE public.shopify_sync_logs RENAME COLUMN stones_added TO stones_added_legacy;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shopify_sync_logs' AND column_name='stones_updated') THEN
    ALTER TABLE public.shopify_sync_logs RENAME COLUMN stones_updated TO stones_updated_legacy;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shopify_sync_logs' AND column_name='stones_archived') THEN
    ALTER TABLE public.shopify_sync_logs RENAME COLUMN stones_archived TO stones_archived_legacy;
  END IF;
END $$;

-- Update status enum values used by new sync engine
-- 'running'→'in_progress', 'ok'→'completed', 'partial'→'failed_partial', 'error'→'failed_critical'
UPDATE public.shopify_sync_logs SET status = 'in_progress'    WHERE status = 'running';
UPDATE public.shopify_sync_logs SET status = 'completed'      WHERE status = 'ok';
UPDATE public.shopify_sync_logs SET status = 'failed_partial' WHERE status = 'partial';
UPDATE public.shopify_sync_logs SET status = 'failed_critical' WHERE status = 'error';

-- Index for fast jeweller + time queries
CREATE INDEX IF NOT EXISTS idx_shopify_sync_logs_jeweller_started
  ON public.shopify_sync_logs(jeweller_id, started_at DESC);

NOTIFY pgrst, 'reload schema';
