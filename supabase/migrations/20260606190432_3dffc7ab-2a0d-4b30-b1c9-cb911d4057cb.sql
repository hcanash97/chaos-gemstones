CREATE TABLE IF NOT EXISTS public.site_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  theme_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_configurations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_configurations TO authenticated;
GRANT ALL ON public.site_configurations TO service_role;

ALTER TABLE public.site_configurations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_site_configurations_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS site_configurations_set_updated_at ON public.site_configurations;
CREATE TRIGGER site_configurations_set_updated_at
BEFORE UPDATE ON public.site_configurations
FOR EACH ROW EXECUTE FUNCTION public.set_site_configurations_updated_at();

DROP POLICY IF EXISTS "Public can read active site configurations" ON public.site_configurations;
CREATE POLICY "Public can read active site configurations"
  ON public.site_configurations FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can insert site configurations" ON public.site_configurations;
CREATE POLICY "Admins can insert site configurations"
  ON public.site_configurations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update site configurations" ON public.site_configurations;
CREATE POLICY "Admins can update site configurations"
  ON public.site_configurations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.site_configurations (is_active, theme_data)
SELECT true, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.site_configurations WHERE is_active = true);

NOTIFY pgrst, 'reload schema';