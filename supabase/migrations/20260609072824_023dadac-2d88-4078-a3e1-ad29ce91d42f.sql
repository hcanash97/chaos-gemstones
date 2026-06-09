
ALTER TABLE public.shopify_connections
  ADD COLUMN IF NOT EXISTS encrypted_client_secret text;

UPDATE public.shopify_connections
  SET encrypted_client_secret = client_secret
  WHERE encrypted_client_secret IS NULL AND client_secret IS NOT NULL;

ALTER TABLE public.shopify_connections
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS client_secret;
