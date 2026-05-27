GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_selections TO authenticated;
GRANT ALL ON public.feed_selections TO service_role;

DROP POLICY IF EXISTS "jewellers manage own keys" ON public.api_keys;
CREATE POLICY "jewellers read own keys"
ON public.api_keys
FOR SELECT
TO authenticated
USING (
  auth.uid() = jeweller_id
);

CREATE POLICY "approved jewellers create own keys"
ON public.api_keys
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = jeweller_id
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.account_type = 'jeweller'
      AND p.is_approved = true
  )
);

CREATE POLICY "jewellers update own keys"
ON public.api_keys
FOR UPDATE
TO authenticated
USING (
  auth.uid() = jeweller_id
)
WITH CHECK (
  auth.uid() = jeweller_id
);

CREATE POLICY "jewellers delete own keys"
ON public.api_keys
FOR DELETE
TO authenticated
USING (
  auth.uid() = jeweller_id
);

DROP POLICY IF EXISTS "jewellers manage own selections" ON public.feed_selections;
CREATE POLICY "jewellers read own selections"
ON public.feed_selections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.api_keys k
    WHERE k.id = feed_selections.api_key_id
      AND k.jeweller_id = auth.uid()
  )
);

CREATE POLICY "jewellers create own selections"
ON public.feed_selections
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.api_keys k
    JOIN public.profiles p ON p.id = k.jeweller_id
    WHERE k.id = feed_selections.api_key_id
      AND k.jeweller_id = auth.uid()
      AND p.account_type = 'jeweller'
      AND p.is_approved = true
  )
);

CREATE POLICY "jewellers update own selections"
ON public.feed_selections
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.api_keys k
    WHERE k.id = feed_selections.api_key_id
      AND k.jeweller_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.api_keys k
    WHERE k.id = feed_selections.api_key_id
      AND k.jeweller_id = auth.uid()
  )
);

CREATE POLICY "jewellers delete own selections"
ON public.feed_selections
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.api_keys k
    WHERE k.id = feed_selections.api_key_id
      AND k.jeweller_id = auth.uid()
  )
);