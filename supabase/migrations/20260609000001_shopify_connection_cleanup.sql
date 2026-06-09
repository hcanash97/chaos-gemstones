-- Ensure shopify_connections has the right constraints for the OAuth flow.

-- 1. Allow access_token to be null (needed before token is exchanged)
ALTER TABLE public.shopify_connections
  ALTER COLUMN access_token DROP NOT NULL;

-- 2. Deduplicate: keep only the most recent row per jeweller
DELETE FROM public.shopify_connections sc
USING public.shopify_connections sc2
WHERE sc.jeweller_id = sc2.jeweller_id
  AND sc.created_at < sc2.created_at;

-- 3. Add UNIQUE constraint so upsert works correctly
ALTER TABLE public.shopify_connections
  DROP CONSTRAINT IF EXISTS shopify_connections_jeweller_id_key;
ALTER TABLE public.shopify_connections
  ADD CONSTRAINT shopify_connections_jeweller_id_key UNIQUE (jeweller_id);

NOTIFY pgrst, 'reload schema';
