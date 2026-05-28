ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS jeweller_notes TEXT,
  ADD COLUMN IF NOT EXISTS shipping_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS carrier TEXT,
  ADD COLUMN IF NOT EXISTS expected_delivery DATE,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS jeweller_confirmed_receipt BOOLEAN DEFAULT false;

CREATE POLICY "dealers update own orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = dealer_id)
  WITH CHECK (auth.uid() = dealer_id);

CREATE POLICY "jewellers update own orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = jeweller_id)
  WITH CHECK (auth.uid() = jeweller_id);