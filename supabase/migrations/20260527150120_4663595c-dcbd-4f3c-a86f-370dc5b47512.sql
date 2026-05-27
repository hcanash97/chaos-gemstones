-- 1) Orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid REFERENCES public.enquiries(id) ON DELETE SET NULL,
  dealer_id uuid NOT NULL,
  jeweller_id uuid NOT NULL,
  stone_id uuid REFERENCES public.stones(id) ON DELETE SET NULL,
  wholesale_price_usd numeric,
  sale_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dealers read own orders" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = dealer_id);
CREATE POLICY "jewellers read own orders" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = jeweller_id);
CREATE POLICY "admins read all orders" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "dealers insert own orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = dealer_id);

CREATE INDEX orders_dealer_idx ON public.orders(dealer_id, sale_date DESC);
CREATE INDEX orders_jeweller_idx ON public.orders(jeweller_id, sale_date DESC);

-- 2) On new order: mark stone as sold + notify jeweller
CREATE OR REPLACE FUNCTION public.on_order_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stone_id IS NOT NULL THEN
    UPDATE public.stones SET status = 'sold', updated_at = now() WHERE id = NEW.stone_id;
  END IF;
  PERFORM public.notify_email_event('order_marked_fulfilled', NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_after_insert
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.on_order_insert();

-- 3) Schedule saved-search digest (daily 08:00 UTC), idempotent
DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'saved-search-digest';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'saved-search-digest',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://chaosgemstones.com/api/public/cron/saved-search-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uZ2RzeHVvdWp2bWhucXp3bG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NTQ3NTksImV4cCI6MjA5NTQzMDc1OX0.i-IZR3qhkR64_88CJABk_jpgHbG0mZGj4U1hw0Ib7qM'
    ),
    body := '{}'::jsonb
  );
  $$
);