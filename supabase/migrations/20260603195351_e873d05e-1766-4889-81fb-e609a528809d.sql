
ALTER TABLE public.jeweller_profiles
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS founded_year INTEGER,
  ADD COLUMN IF NOT EXISTS specialities TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.dealer_profiles
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS founded_year INTEGER,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS story TEXT,
  ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}';

-- Backfill slugs from profiles.company_name
UPDATE public.jeweller_profiles jp
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(COALESCE(p.company_name, 'jeweller-' || substr(jp.id::text, 1, 8)), '[^a-zA-Z0-9]+', '-', 'g'),
    '(^-+|-+$)', '', 'g'
  )
) || '-' || substr(jp.id::text, 1, 4)
FROM public.profiles p
WHERE jp.id = p.id AND jp.slug IS NULL;

-- Public read policy for opted-in approved jewellers
DROP POLICY IF EXISTS "public read opted-in jewellers" ON public.jeweller_profiles;
CREATE POLICY "public read opted-in jewellers" ON public.jeweller_profiles
  FOR SELECT TO anon, authenticated
  USING (
    is_public = true
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = jeweller_profiles.id
        AND p.is_approved = true
        AND (p.account_type = 'jeweller' OR 'jeweller' = ANY(p.account_types))
    )
  );
