-- Recover safe Lovable-side changes from the duplicate repo without
-- downgrading the newer patch72 Shopify sync repair.

-- 1. Security definer view repair: expose the public dealer view as an
-- invoker-rights view so it respects the querying role's RLS context.
DROP VIEW IF EXISTS public.dealer_profiles_public;
CREATE VIEW public.dealer_profiles_public
WITH (security_invoker = true) AS
SELECT
  id,
  full_name,
  company_name,
  city,
  country,
  account_type,
  account_types,
  is_approved,
  is_verified,
  website,
  created_at
FROM public.profiles
WHERE is_approved = true
  AND (
    account_type = 'dealer'::account_type
    OR ('dealer'::text = ANY (account_types))
  );

GRANT SELECT ON public.dealer_profiles_public TO anon, authenticated;

-- 2. Defense in depth: these tables should only be written by server-side
-- service-role functions. Create deny policies only when absent so re-running
-- the migration is safe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shopify_oauth_states'
      AND policyname = 'Deny all client access'
  ) THEN
    CREATE POLICY "Deny all client access" ON public.shopify_oauth_states
      AS RESTRICTIVE FOR ALL TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shopify_sync_logs'
      AND policyname = 'Deny client writes'
  ) THEN
    CREATE POLICY "Deny client writes" ON public.shopify_sync_logs
      AS RESTRICTIVE FOR INSERT TO anon, authenticated
      WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shopify_sync_logs'
      AND policyname = 'Deny client updates'
  ) THEN
    CREATE POLICY "Deny client updates" ON public.shopify_sync_logs
      AS RESTRICTIVE FOR UPDATE TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shopify_sync_logs'
      AND policyname = 'Deny client deletes'
  ) THEN
    CREATE POLICY "Deny client deletes" ON public.shopify_sync_logs
      AS RESTRICTIVE FOR DELETE TO anon, authenticated
      USING (false);
  END IF;
END $$;

-- 3. Platform fee alignment. The app copy uses a GBP cap; this trigger stores
-- the existing database-side USD field with the same numeric cap until a future
-- currency-normalised billing table is introduced.
CREATE OR REPLACE FUNCTION public.on_order_receipt_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.jeweller_confirmed_receipt = true
     AND (OLD.jeweller_confirmed_receipt IS DISTINCT FROM true) THEN
    IF NEW.received_at IS NULL THEN
      NEW.received_at := now();
    END IF;

    IF NEW.platform_fee_usd IS NULL AND NEW.wholesale_price_usd IS NOT NULL THEN
      NEW.platform_fee_usd := LEAST(GREATEST(NEW.wholesale_price_usd * 0.025, 2), 50);
    END IF;

    PERFORM public.notify_email_event('order_received_dealer', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
