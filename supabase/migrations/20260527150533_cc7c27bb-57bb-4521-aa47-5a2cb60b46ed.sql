
ALTER TABLE public.dealer_profiles ADD COLUMN IF NOT EXISTS external_feed_url text;
ALTER TABLE public.stones ADD COLUMN IF NOT EXISTS feed_inactive boolean NOT NULL DEFAULT false;
ALTER TABLE public.stones ADD COLUMN IF NOT EXISTS share_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_stone_share(_stone_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.stones SET share_count = share_count + 1 WHERE id = _stone_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_stone_share(uuid) TO anon, authenticated;
