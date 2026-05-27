-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Helper: fire-and-forget POST to the email notify endpoint
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
  -- never fail the originating transaction because email plumbing hiccuped
  RAISE WARNING 'notify_email_event failed: %', SQLERRM;
END;
$$;

-- Trigger 1: account received (new profile)
CREATE OR REPLACE FUNCTION public.on_profile_insert_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_email_event('account_received', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_insert_email ON public.profiles;
CREATE TRIGGER trg_profile_insert_email
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.on_profile_insert_notify();

-- Trigger 2: account approved (is_approved flipped to true)
CREATE OR REPLACE FUNCTION public.on_profile_approved_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_approved = true AND (OLD.is_approved IS DISTINCT FROM true) THEN
    IF NEW.account_type = 'dealer' THEN
      PERFORM public.notify_email_event('account_approved_dealer', NEW.id);
    ELSIF NEW.account_type = 'jeweller' THEN
      PERFORM public.notify_email_event('account_approved_jeweller', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_approved_email ON public.profiles;
CREATE TRIGGER trg_profile_approved_email
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.on_profile_approved_notify();

-- Trigger 3: new enquiry → dealer
CREATE OR REPLACE FUNCTION public.on_enquiry_insert_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_email_event('enquiry_new_dealer', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enquiry_insert_email ON public.enquiries;
CREATE TRIGGER trg_enquiry_insert_email
  AFTER INSERT ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.on_enquiry_insert_notify();

-- Trigger 4: enquiry reply by dealer → jeweller
CREATE OR REPLACE FUNCTION public.on_enquiry_message_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_dealer uuid;
BEGIN
  SELECT to_dealer_id INTO v_dealer FROM public.enquiries WHERE id = NEW.enquiry_id;
  IF v_dealer IS NOT NULL AND v_dealer = NEW.sender_id THEN
    PERFORM public.notify_email_event('enquiry_reply_jeweller', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enquiry_message_email ON public.enquiry_messages;
CREATE TRIGGER trg_enquiry_message_email
  AFTER INSERT ON public.enquiry_messages
  FOR EACH ROW EXECUTE FUNCTION public.on_enquiry_message_notify();

-- Cron: daily digest at 8am UTC
-- Unschedule first in case it already exists (re-running migration safe)
DO $$
BEGIN
  PERFORM cron.unschedule('chaos-daily-digest');
EXCEPTION WHEN OTHERS THEN
  -- job didn't exist, ignore
  NULL;
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