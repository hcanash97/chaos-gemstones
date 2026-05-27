CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_type public.account_type := 'jeweller';
  v_requested TEXT;
  v_full_name TEXT;
  v_company TEXT;
  v_country TEXT;
BEGIN
  -- Only honour 'dealer' or 'jeweller' from user-supplied metadata.
  -- Never allow self-assignment of 'admin' or any other privileged role.
  v_requested := NEW.raw_user_meta_data->>'account_type';
  IF v_requested = 'dealer' THEN
    v_account_type := 'dealer';
  ELSE
    v_account_type := 'jeweller';
  END IF;

  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_company := NEW.raw_user_meta_data->>'company_name';
  v_country := NEW.raw_user_meta_data->>'country';

  INSERT INTO public.profiles (id, email, full_name, account_type, company_name, country, is_approved)
  VALUES (NEW.id, NEW.email, v_full_name, v_account_type, v_company, v_country, FALSE);

  IF v_account_type = 'jeweller' THEN
    INSERT INTO public.jeweller_profiles (id) VALUES (NEW.id);
  ELSIF v_account_type = 'dealer' THEN
    INSERT INTO public.dealer_profiles (id, slug)
    VALUES (NEW.id, 'dealer-' || substr(NEW.id::text, 1, 8));
  END IF;

  RETURN NEW;
END;
$function$;