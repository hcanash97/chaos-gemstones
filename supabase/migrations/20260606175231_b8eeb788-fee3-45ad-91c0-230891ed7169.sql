
-- 1) system_config table for internal shared secrets
CREATE TABLE IF NOT EXISTS public.system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.system_config TO service_role;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated; service_role bypasses RLS.

INSERT INTO public.system_config(key, value)
VALUES ('email_hook_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- 2) Block self-approval on profiles UPDATE.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved
     OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.account_type IS DISTINCT FROM OLD.account_type
     OR NEW.account_types IS DISTINCT FROM OLD.account_types
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    RAISE EXCEPTION 'Not authorized to change privileged profile fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_block_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 3) dealer_profiles — restrict public read and hide feed credentials.
DROP POLICY IF EXISTS "public read dealer profiles" ON public.dealer_profiles;
CREATE POLICY "public read approved dealer profiles" ON public.dealer_profiles
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = dealer_profiles.id
        AND p.is_approved = true
        AND (p.account_type = 'dealer'::account_type OR 'dealer' = ANY(p.account_types))
    )
  );

REVOKE SELECT (external_feed_url, external_feed_method, external_feed_body)
  ON public.dealer_profiles FROM anon, authenticated;

-- 4) jeweller_profiles — hide pricing strategy columns.
REVOKE SELECT (markup_global, feed_currency, display_currency, sourcing_method)
  ON public.jeweller_profiles FROM anon, authenticated;

-- 5) Admin SELECT on enquiries / enquiry_messages.
DROP POLICY IF EXISTS "admins read enquiries" ON public.enquiries;
CREATE POLICY "admins read enquiries" ON public.enquiries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admins read enquiry messages" ON public.enquiry_messages;
CREATE POLICY "admins read enquiry messages" ON public.enquiry_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6) Reporters can read own reports.
DROP POLICY IF EXISTS "reporters read own reports" ON public.reports;
CREATE POLICY "reporters read own reports" ON public.reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

-- 7) notify_email_event — send the shared secret as Authorization Bearer header.
CREATE OR REPLACE FUNCTION public.notify_email_event(p_type text, p_record_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT value INTO v_secret FROM public.system_config WHERE key = 'email_hook_secret';
  PERFORM net.http_post(
    url := 'https://project--664931b8-ad5b-4674-aece-47159cf3778c.lovable.app/api/public/hooks/email/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_secret, '')
    ),
    body := jsonb_build_object('type', p_type, 'record_id', p_record_id)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_email_event failed: %', SQLERRM;
END;
$$;
