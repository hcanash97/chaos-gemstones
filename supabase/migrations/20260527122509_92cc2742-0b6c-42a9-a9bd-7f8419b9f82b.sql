CREATE OR REPLACE FUNCTION public.notify_email_event(p_type text, p_record_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://project--664931b8-ad5b-4674-aece-47159cf3778c.lovable.app/api/public/hooks/email/notify',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('type', p_type, 'record_id', p_record_id)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_email_event failed: %', SQLERRM;
END;
$$;

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
    url := 'https://project--664931b8-ad5b-4674-aece-47159cf3778c.lovable.app/api/public/cron/digest',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $cron$
);