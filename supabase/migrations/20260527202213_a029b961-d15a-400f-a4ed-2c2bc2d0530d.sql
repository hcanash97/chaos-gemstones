ALTER TABLE public.stones ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "public read available stones" ON public.stones;

CREATE POLICY "public read available stones"
ON public.stones
FOR SELECT
TO anon, authenticated
USING (
  status = 'available'::stone_status
  AND (is_test = false OR public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE INDEX IF NOT EXISTS idx_stones_is_test ON public.stones(is_test) WHERE is_test = true;