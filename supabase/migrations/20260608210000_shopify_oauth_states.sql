-- Temporary state store for Shopify OAuth flow.
-- Each row lives for 10 minutes (enforced in application logic).
CREATE TABLE IF NOT EXISTS public.shopify_oauth_states (
  jeweller_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  state       text NOT NULL,
  shop_domain text NOT NULL,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shopify_oauth_states ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.shopify_oauth_states TO service_role;
-- Service role only — no authenticated user needs to read this directly.
NOTIFY pgrst, 'reload schema';
