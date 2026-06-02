ALTER TABLE public.shopify_connections
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS client_secret TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

ALTER TABLE public.shopify_connections
  ALTER COLUMN access_token DROP NOT NULL;