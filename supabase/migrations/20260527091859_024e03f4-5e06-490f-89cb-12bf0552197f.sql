
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS key_prefix text;

CREATE POLICY "authenticated read approved dealer profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (account_type = 'dealer' AND is_approved = true);

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.profiles
WHERE email = 'hamish.nash@yahoo.com'
ON CONFLICT DO NOTHING;
