ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS platform_fee_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS platform_fee_currency TEXT DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS fee_invoiced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fee_paid_at TIMESTAMPTZ;

-- Auto-calc fee + notify dealer when jeweller confirms receipt
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
      NEW.platform_fee_usd := LEAST(GREATEST(NEW.wholesale_price_usd * 0.02, 5), 150);
    END IF;
    PERFORM public.notify_email_event('order_received_dealer', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_receipt_confirmed
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.on_order_receipt_confirmed();

-- Notify jeweller when tracking number is set
CREATE OR REPLACE FUNCTION public.on_order_tracking_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tracking_number IS NOT NULL
     AND (OLD.tracking_number IS NULL OR OLD.tracking_number = '') THEN
    IF NEW.shipping_status = 'pending' OR NEW.shipping_status IS NULL THEN
      NEW.shipping_status := 'shipped';
    END IF;
    PERFORM public.notify_email_event('order_shipped_jeweller', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_tracking_added
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.on_order_tracking_added();