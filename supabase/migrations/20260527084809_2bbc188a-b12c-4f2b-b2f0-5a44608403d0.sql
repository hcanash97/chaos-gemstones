
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.account_type AS ENUM ('dealer', 'jeweller', 'admin');
CREATE TYPE public.stone_status AS ENUM ('available', 'reserved', 'sold');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  account_type public.account_type NOT NULL DEFAULT 'jeweller',
  company_name TEXT,
  website TEXT,
  country TEXT,
  city TEXT,
  phone TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES (admin separation) ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ DEALER PROFILES ============
CREATE TABLE public.dealer_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT,
  specialities TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  years_trading INTEGER,
  logo_url TEXT,
  response_time_hours INTEGER,
  gia_member BOOLEAN DEFAULT FALSE,
  igi_member BOOLEAN DEFAULT FALSE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dealer_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dealer_profiles TO authenticated;
GRANT ALL ON public.dealer_profiles TO service_role;
ALTER TABLE public.dealer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read dealer profiles" ON public.dealer_profiles
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dealers manage own dealer profile insert" ON public.dealer_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "dealers manage own dealer profile update" ON public.dealer_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "admins manage dealer profiles" ON public.dealer_profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ JEWELLER PROFILES ============
CREATE TABLE public.jeweller_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  markup_global NUMERIC NOT NULL DEFAULT 2.0,
  bio TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jeweller_profiles TO authenticated;
GRANT ALL ON public.jeweller_profiles TO service_role;
ALTER TABLE public.jeweller_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jeweller read own" ON public.jeweller_profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "jeweller insert own" ON public.jeweller_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "jeweller update own" ON public.jeweller_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============ STONES ============
CREATE TABLE public.stones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stone_type TEXT NOT NULL,
  origin TEXT,
  treatment TEXT,
  country_of_origin TEXT,
  shape TEXT,
  carat_weight NUMERIC,
  colour_grade TEXT,
  clarity_grade TEXT,
  cut_grade TEXT,
  polish TEXT,
  symmetry TEXT,
  fluorescence TEXT,
  colour_hue TEXT,
  colour_tone TEXT,
  colour_saturation TEXT,
  cert_lab TEXT,
  cert_number TEXT,
  cert_url TEXT,
  report_date DATE,
  wholesale_price_usd NUMERIC,
  available_qty INTEGER NOT NULL DEFAULT 1,
  lead_time_days INTEGER,
  status public.stone_status NOT NULL DEFAULT 'available',
  video_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stones TO authenticated;
GRANT ALL ON public.stones TO service_role;
ALTER TABLE public.stones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read available stones" ON public.stones
  FOR SELECT TO anon, authenticated USING (status = 'available');
CREATE POLICY "dealers read own stones" ON public.stones
  FOR SELECT TO authenticated USING (auth.uid() = dealer_id);
CREATE POLICY "dealers insert own stones" ON public.stones
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = dealer_id);
CREATE POLICY "dealers update own stones" ON public.stones
  FOR UPDATE TO authenticated USING (auth.uid() = dealer_id);
CREATE POLICY "dealers delete own stones" ON public.stones
  FOR DELETE TO authenticated USING (auth.uid() = dealer_id);
CREATE POLICY "admins manage stones" ON public.stones
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX stones_status_idx ON public.stones(status);
CREATE INDEX stones_dealer_idx ON public.stones(dealer_id);
CREATE INDEX stones_type_idx ON public.stones(stone_type);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER stones_updated_at BEFORE UPDATE ON public.stones
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ STONE IMAGES ============
CREATE TABLE public.stone_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stone_id UUID NOT NULL REFERENCES public.stones(id) ON DELETE CASCADE,
  storage_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE
);
GRANT SELECT ON public.stone_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stone_images TO authenticated;
GRANT ALL ON public.stone_images TO service_role;
ALTER TABLE public.stone_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read stone images" ON public.stone_images
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dealers manage own stone images" ON public.stone_images
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.stones s WHERE s.id = stone_id AND s.dealer_id = auth.uid())
  );

-- ============ API KEYS ============
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jeweller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_hash TEXT UNIQUE NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jewellers manage own keys" ON public.api_keys
  FOR ALL TO authenticated USING (auth.uid() = jeweller_id) WITH CHECK (auth.uid() = jeweller_id);

-- ============ FEED SELECTIONS ============
CREATE TABLE public.feed_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  selection_type TEXT NOT NULL,
  dealer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  stone_id UUID REFERENCES public.stones(id) ON DELETE CASCADE,
  markup_override NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_selections TO authenticated;
GRANT ALL ON public.feed_selections TO service_role;
ALTER TABLE public.feed_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jewellers manage own selections" ON public.feed_selections
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.api_keys k WHERE k.id = api_key_id AND k.jeweller_id = auth.uid())
  );

-- ============ ENQUIRIES ============
CREATE TABLE public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_jeweller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_dealer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stone_id UUID REFERENCES public.stones(id) ON DELETE SET NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enquiries TO authenticated;
GRANT ALL ON public.enquiries TO service_role;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read enquiries" ON public.enquiries
  FOR SELECT TO authenticated
  USING (auth.uid() = from_jeweller_id OR auth.uid() = to_dealer_id);
CREATE POLICY "jewellers create enquiries" ON public.enquiries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_jeweller_id);
CREATE POLICY "participants update enquiries" ON public.enquiries
  FOR UPDATE TO authenticated
  USING (auth.uid() = from_jeweller_id OR auth.uid() = to_dealer_id);

-- ============ ENQUIRY MESSAGES ============
CREATE TABLE public.enquiry_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enquiry_messages TO authenticated;
GRANT ALL ON public.enquiry_messages TO service_role;
ALTER TABLE public.enquiry_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read messages" ON public.enquiry_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.enquiries e WHERE e.id = enquiry_id
      AND (e.from_jeweller_id = auth.uid() OR e.to_dealer_id = auth.uid()))
  );
CREATE POLICY "participants write messages" ON public.enquiry_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.enquiries e WHERE e.id = enquiry_id
      AND (e.from_jeweller_id = auth.uid() OR e.to_dealer_id = auth.uid()))
  );

-- ============ NEW USER TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type public.account_type := 'jeweller';
  v_full_name TEXT;
  v_company TEXT;
  v_country TEXT;
BEGIN
  IF NEW.raw_user_meta_data ? 'account_type' THEN
    BEGIN
      v_account_type := (NEW.raw_user_meta_data->>'account_type')::public.account_type;
    EXCEPTION WHEN OTHERS THEN
      v_account_type := 'jeweller';
    END;
  END IF;
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_company := NEW.raw_user_meta_data->>'company_name';
  v_country := NEW.raw_user_meta_data->>'country';

  INSERT INTO public.profiles (id, email, full_name, account_type, company_name, country, is_approved)
  VALUES (NEW.id, NEW.email, v_full_name, v_account_type, v_company, v_country, FALSE);

  IF v_account_type = 'jeweller' THEN
    INSERT INTO public.jeweller_profiles (id) VALUES (NEW.id);
  ELSIF v_account_type = 'dealer' THEN
    INSERT INTO public.dealer_profiles (id, slug)
    VALUES (NEW.id, 'dealer-' || substr(NEW.id::text, 1, 8));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('stone-images', 'stone-images', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('cert-scans', 'cert-scans', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read stone-images" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'stone-images');
CREATE POLICY "authenticated upload stone-images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'stone-images' AND owner = auth.uid());
CREATE POLICY "owners update stone-images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'stone-images' AND owner = auth.uid());
CREATE POLICY "owners delete stone-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'stone-images' AND owner = auth.uid());

CREATE POLICY "owners read cert-scans" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'cert-scans' AND owner = auth.uid());
CREATE POLICY "authenticated upload cert-scans" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cert-scans' AND owner = auth.uid());
CREATE POLICY "owners delete cert-scans" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'cert-scans' AND owner = auth.uid());
