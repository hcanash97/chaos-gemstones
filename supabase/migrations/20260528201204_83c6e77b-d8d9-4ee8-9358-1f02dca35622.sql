-- Helper: insert paired referral credits
CREATE OR REPLACE FUNCTION public.issue_referral_credits(
  _new_user_id UUID,
  _qualifying_event TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer UUID;
  v_new_type public.account_type;
  v_ref_type public.account_type;
  v_cross BOOLEAN;
  v_months INTEGER;
  v_gbp NUMERIC;
  v_credit_type TEXT;
  v_referrer_reason TEXT;
BEGIN
  SELECT referred_by, account_type INTO v_referrer, v_new_type
  FROM public.profiles WHERE id = _new_user_id;

  IF v_referrer IS NULL THEN RETURN; END IF;

  SELECT account_type INTO v_ref_type FROM public.profiles WHERE id = v_referrer;
  v_cross := (v_ref_type IS DISTINCT FROM v_new_type);

  -- Determine credit amount/type by event
  IF _qualifying_event = 'jeweller_first_order' THEN
    v_credit_type := 'credit_gbp';
    v_gbp := CASE WHEN v_cross THEN 200 ELSE 100 END;
    v_months := 0;
    v_referrer_reason := 'Referred a jeweller who completed their first order';
  ELSIF _qualifying_event = 'dealer_10_stones' THEN
    v_credit_type := 'free_months';
    v_months := CASE WHEN v_cross THEN 6 ELSE 3 END;
    v_gbp := 0;
    v_referrer_reason := 'Referred a dealer who listed 10+ stones';
  ELSIF _qualifying_event = 'jeweller_first_api_key' THEN
    v_credit_type := 'free_months';
    v_months := CASE WHEN v_cross THEN 6 ELSE 3 END;
    v_gbp := 0;
    v_referrer_reason := 'Referred a jeweller who activated their API feed';
  ELSE
    RETURN;
  END IF;

  -- Referrer credit
  INSERT INTO public.referral_credits
    (beneficiary_id, referral_id, credit_type, credit_months, credit_gbp, reason, status, qualifying_event, qualifying_event_at, cross_side)
  VALUES
    (v_referrer, _new_user_id, v_credit_type, v_months, v_gbp, v_referrer_reason, 'active', _qualifying_event, now(), v_cross)
  ON CONFLICT (beneficiary_id, qualifying_event, referral_id) DO NOTHING;

  -- Welcome bonus to new user (only on first qualifying event)
  INSERT INTO public.referral_credits
    (beneficiary_id, referral_id, credit_type, credit_months, credit_gbp, reason, status, qualifying_event, qualifying_event_at, cross_side)
  VALUES
    (_new_user_id, v_referrer, 'free_months', 3, 0, 'Welcome bonus — referred by a Chaos member', 'active', 'referred_signup', now(), v_cross)
  ON CONFLICT (beneficiary_id, qualifying_event, referral_id) DO NOTHING;

  -- Notify both via email
  PERFORM public.notify_email_event('referral_qualified_referrer', v_referrer);
  PERFORM public.notify_email_event('referral_welcome_bonus', _new_user_id);
END;
$$;

-- Trigger: dealer reaches 10 stones
CREATE OR REPLACE FUNCTION public.on_stone_insert_check_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.stones WHERE dealer_id = NEW.dealer_id;
  IF v_count = 10 THEN
    PERFORM public.issue_referral_credits(NEW.dealer_id, 'dealer_10_stones');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stones_check_referral ON public.stones;
CREATE TRIGGER stones_check_referral
  AFTER INSERT ON public.stones
  FOR EACH ROW
  EXECUTE FUNCTION public.on_stone_insert_check_referral();

-- Trigger: jeweller's first API key
CREATE OR REPLACE FUNCTION public.on_api_key_insert_check_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.api_keys WHERE jeweller_id = NEW.jeweller_id;
  IF v_count = 1 THEN
    PERFORM public.issue_referral_credits(NEW.jeweller_id, 'jeweller_first_api_key');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS api_keys_check_referral ON public.api_keys;
CREATE TRIGGER api_keys_check_referral
  AFTER INSERT ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.on_api_key_insert_check_referral();

-- Trigger: jeweller's first confirmed order
CREATE OR REPLACE FUNCTION public.on_order_confirmed_check_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NEW.jeweller_confirmed_receipt = true
     AND (OLD.jeweller_confirmed_receipt IS DISTINCT FROM true) THEN
    SELECT COUNT(*) INTO v_count
    FROM public.orders
    WHERE jeweller_id = NEW.jeweller_id AND jeweller_confirmed_receipt = true;
    IF v_count = 1 THEN
      PERFORM public.issue_referral_credits(NEW.jeweller_id, 'jeweller_first_order');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_check_referral ON public.orders;
CREATE TRIGGER orders_check_referral
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.on_order_confirmed_check_referral();

-- Server function to apply a referral code post-signup
CREATE OR REPLACE FUNCTION public.apply_referral_code(_user_id UUID, _code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer UUID;
BEGIN
  IF _code IS NULL OR _code = '' THEN RETURN; END IF;
  SELECT id INTO v_referrer FROM public.profiles
    WHERE referral_code = UPPER(_code) AND id <> _user_id LIMIT 1;
  IF v_referrer IS NOT NULL THEN
    UPDATE public.profiles SET referred_by = v_referrer
      WHERE id = _user_id AND referred_by IS NULL;
  END IF;
END;
$$;