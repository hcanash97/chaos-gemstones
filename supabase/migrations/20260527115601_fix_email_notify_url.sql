-- Use the stable preview URL so triggers work before the project is published.
-- The -dev hostname serves the latest preview build and is immutable.
CREATE OR REPLACE FUNCTION public.notify_email_event(p_type text, p_record_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://project--664931b8-ad5b-4674-aece-47159cf3778c-dev.lovable.app/api/public/hooks/email/notify',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('type', p_type, 'record_id', p_record_id)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_email_event failed: %', SQLERRM;
END;
$$;

-- Also update the cron digest URL for the same reason.
DO $$
BEGIN
  PERFORM cron.unschedule('chaos-daily-digest');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'chaos-daily-digest',
  '0 8 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--664931b8-ad5b-4674-aece-47159cf3778c-dev.lovable.app/api/public/cron/digest',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $cron$
);

-- Backfill: resend the "account_received" email for the most recent signup
-- so you can verify end-to-end without creating another account.
DO $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.profiles ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NOT NULL THEN
    PERFORM public.notify_email_event('account_received', v_id);
  END IF;
END $$;
