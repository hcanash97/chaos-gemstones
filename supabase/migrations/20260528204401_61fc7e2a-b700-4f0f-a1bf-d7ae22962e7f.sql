
CREATE TABLE public.shopify_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jeweller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  access_token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_sync BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  products_synced INTEGER NOT NULL DEFAULT 0,
  shop_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(jeweller_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopify_connections TO authenticated;
GRANT ALL ON public.shopify_connections TO service_role;

ALTER TABLE public.shopify_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jewellers manage own shopify connection"
  ON public.shopify_connections FOR ALL
  TO authenticated
  USING (auth.uid() = jeweller_id)
  WITH CHECK (auth.uid() = jeweller_id);

CREATE TRIGGER touch_shopify_connections
  BEFORE UPDATE ON public.shopify_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.shopify_product_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jeweller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stone_id UUID NOT NULL REFERENCES public.stones(id) ON DELETE CASCADE,
  shopify_product_id TEXT NOT NULL,
  shopify_handle TEXT,
  shopify_product_status TEXT NOT NULL DEFAULT 'active',
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(jeweller_id, stone_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopify_product_map TO authenticated;
GRANT ALL ON public.shopify_product_map TO service_role;

ALTER TABLE public.shopify_product_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jewellers manage own shopify product map"
  ON public.shopify_product_map FOR ALL
  TO authenticated
  USING (auth.uid() = jeweller_id)
  WITH CHECK (auth.uid() = jeweller_id);

CREATE INDEX idx_shopify_product_map_jeweller ON public.shopify_product_map(jeweller_id);
CREATE INDEX idx_shopify_product_map_stone ON public.shopify_product_map(stone_id);

CREATE TABLE public.shopify_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jeweller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  stones_added INTEGER NOT NULL DEFAULT 0,
  stones_updated INTEGER NOT NULL DEFAULT 0,
  stones_archived INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

GRANT SELECT, INSERT, UPDATE ON public.shopify_sync_logs TO authenticated;
GRANT ALL ON public.shopify_sync_logs TO service_role;

ALTER TABLE public.shopify_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jewellers view own shopify sync logs"
  ON public.shopify_sync_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = jeweller_id);

CREATE INDEX idx_shopify_sync_logs_jeweller_started ON public.shopify_sync_logs(jeweller_id, started_at DESC);
