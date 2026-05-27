
-- Demo dealer auth users (instant_confirmed so we can use later if needed)
DO $$
DECLARE
  d1 uuid := '11111111-1111-1111-1111-111111111111';
  d2 uuid := '22222222-2222-2222-2222-222222222222';
  d3 uuid := '33333333-3333-3333-3333-333333333333';
  d4 uuid := '44444444-4444-4444-4444-444444444444';
  d5 uuid := '55555555-5555-5555-5555-555555555555';
  d6 uuid := '66666666-6666-6666-6666-666666666666';
BEGIN
  -- Create auth users via direct insert (demo only). Trigger handle_new_user will populate profiles + dealer_profiles.
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES
    (d1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo+jaipurgems@chaos.local', crypt('demo-only-no-login', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"account_type":"dealer","full_name":"Rohan Sharma","company_name":"Jaipur Heritage Gems","country":"India"}', now(), now(), '', '', '', ''),
    (d2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo+suratdiamonds@chaos.local', crypt('demo-only-no-login', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"account_type":"dealer","full_name":"Priya Patel","company_name":"Surat Diamond House","country":"India"}', now(), now(), '', '', '', ''),
    (d3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo+ceylonsapphire@chaos.local', crypt('demo-only-no-login', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"account_type":"dealer","full_name":"Anil Perera","company_name":"Ceylon Sapphire Co.","country":"Sri Lanka"}', now(), now(), '', '', '', ''),
    (d4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo+bangkokgems@chaos.local', crypt('demo-only-no-login', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"account_type":"dealer","full_name":"Somchai Vong","company_name":"Bangkok Coloured Gems","country":"Thailand"}', now(), now(), '', '', '', ''),
    (d5, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo+rubiesburma@chaos.local', crypt('demo-only-no-login', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"account_type":"dealer","full_name":"Aung Min","company_name":"Mogok Ruby Traders","country":"Myanmar"}', now(), now(), '', '', '', ''),
    (d6, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo+jaipurcolor@chaos.local', crypt('demo-only-no-login', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"account_type":"dealer","full_name":"Vikram Singh","company_name":"Pink City Coloured Stones","country":"India"}', now(), now(), '', '', '', '');

  -- Approve and customise profiles
  UPDATE public.profiles SET is_approved = TRUE, is_verified = TRUE, city =
    CASE id WHEN d1 THEN 'Jaipur' WHEN d2 THEN 'Surat' WHEN d3 THEN 'Colombo'
            WHEN d4 THEN 'Bangkok' WHEN d5 THEN 'Yangon' WHEN d6 THEN 'Jaipur' END
    WHERE id IN (d1,d2,d3,d4,d5,d6);

  UPDATE public.dealer_profiles SET
    slug = CASE id WHEN d1 THEN 'jaipur-heritage-gems' WHEN d2 THEN 'surat-diamond-house'
                   WHEN d3 THEN 'ceylon-sapphire-co' WHEN d4 THEN 'bangkok-coloured-gems'
                   WHEN d5 THEN 'mogok-ruby-traders' WHEN d6 THEN 'pink-city-coloured-stones' END,
    bio = CASE id
      WHEN d1 THEN 'Third-generation gemstone specialists in Jaipur. Wide inventory of fine emeralds, rubies and sapphires sourced from across South Asia.'
      WHEN d2 THEN 'Surat-based diamond cutters and dealers. Specialising in GIA and IGI certified loose diamonds for the international trade.'
      WHEN d3 THEN 'Family-run Ceylon sapphire house operating from Colombo since 1978. Direct access to mine production from Ratnapura and Elahera.'
      WHEN d4 THEN 'Bangkok-based wholesalers of fine coloured stones — rubies, sapphires, spinels and unheated material with GRS reports.'
      WHEN d5 THEN 'Specialists in pigeon-blood Mogok rubies and Burmese coloured stones with full provenance documentation.'
      WHEN d6 THEN 'Wide selection of coloured gemstones from across India. Strong inventory of tourmaline, aquamarine, garnet and morganite.'
    END,
    specialities = CASE id
      WHEN d1 THEN ARRAY['Emerald','Ruby','Sapphire']
      WHEN d2 THEN ARRAY['Diamond — Natural','Diamond — Lab Grown']
      WHEN d3 THEN ARRAY['Ceylon Sapphire','Padparadscha']
      WHEN d4 THEN ARRAY['Ruby','Sapphire','Spinel']
      WHEN d5 THEN ARRAY['Burmese Ruby','Spinel']
      WHEN d6 THEN ARRAY['Tourmaline','Aquamarine','Garnet','Morganite']
    END,
    languages = ARRAY['English','Hindi'],
    years_trading = CASE id WHEN d1 THEN 38 WHEN d2 THEN 22 WHEN d3 THEN 46 WHEN d4 THEN 17 WHEN d5 THEN 31 WHEN d6 THEN 12 END,
    response_time_hours = 4,
    gia_member = TRUE,
    featured = (id IN (d1, d2, d3))
  WHERE id IN (d1,d2,d3,d4,d5,d6);

  -- Stones
  INSERT INTO public.stones (dealer_id, stone_type, origin, treatment, country_of_origin, shape, carat_weight, colour_grade, clarity_grade, cut_grade, cert_lab, cert_number, wholesale_price_usd, featured)
  VALUES
    (d2,'diamond','natural','none','South Africa','round',1.52,'F','VS1','Excellent','GIA','2287654321',18400, true),
    (d2,'diamond','natural','none','Botswana','oval',2.01,'G','VS2','Excellent','GIA','2287654322',24900, true),
    (d2,'diamond','lab-grown','none','Lab','round',2.50,'E','VVS2','Excellent','IGI','LG587213',8400, false),
    (d2,'diamond','natural','none','Russia','cushion',1.20,'H','VS1','Very Good','GIA','2287654323',9800, false),
    (d2,'diamond','natural','none','Canada','pear',1.71,'F','VVS2','Excellent','GIA','2287654324',21300, false),
    (d2,'diamond','lab-grown','none','Lab','emerald',3.05,'D','VVS1','Excellent','IGI','LG587214',12600, true),
    (d1,'emerald','natural','none','Colombia','emerald',3.12,NULL,'VS',NULL,'GRS','GRS2024-091',14200, true),
    (d1,'emerald','natural','none','Zambia','oval',2.45,NULL,'VS',NULL,'GRS','GRS2024-092',6800, false),
    (d1,'ruby','natural','heat','Mozambique','oval',2.05,NULL,'VS',NULL,'GRS','GRS2024-101',9200, false),
    (d1,'sapphire','natural','none','Sri Lanka','cushion',4.10,NULL,'VS',NULL,'GRS','GRS2024-110',16400, true),
    (d3,'sapphire','natural','none','Sri Lanka','oval',5.22,NULL,'VS',NULL,'Gübelin','GUB-22041',28900, true),
    (d3,'sapphire','natural','heat','Sri Lanka','cushion',3.85,NULL,'VS',NULL,'GRS','GRS2024-150',7400, false),
    (d3,'sapphire','natural','none','Sri Lanka','pear',2.10,NULL,'VS',NULL,'GRS','GRS2024-151',4900, false),
    (d3,'sapphire','natural','none','Sri Lanka','cushion',6.40,NULL,'VVS',NULL,'AGL','AGL-1102',42000, false),
    (d4,'ruby','natural','none','Mozambique','oval',2.85,NULL,'VS',NULL,'GRS','GRS2024-201',18600, false),
    (d4,'ruby','natural','heat','Thailand','cushion',3.10,NULL,'SI',NULL,'GRS','GRS2024-202',4800, false),
    (d4,'sapphire','natural','none','Madagascar','oval',4.50,NULL,'VS',NULL,'GRS','GRS2024-203',12800, false),
    (d4,'spinel','natural','none','Burma','cushion',2.25,NULL,'VS',NULL,'GRS','GRS2024-204',7200, true),
    (d5,'ruby','natural','none','Burma','oval',1.95,NULL,'VS',NULL,'Gübelin','GUB-22155',39800, true),
    (d5,'ruby','natural','none','Burma','cushion',2.40,NULL,'VS',NULL,'AGL','AGL-1204',54200, false),
    (d5,'spinel','natural','none','Burma','round',1.55,NULL,'VVS',NULL,'GRS','GRS2024-301',5400, false),
    (d5,'ruby','natural','heat','Burma','pear',3.05,NULL,'SI',NULL,'GRS','GRS2024-302',12100, false),
    (d6,'tourmaline','natural','none','Nigeria','cushion',5.10,NULL,'VS',NULL,'GRS','GRS2024-401',2400, false),
    (d6,'aquamarine','natural','none','Brazil','emerald',7.20,NULL,'VVS',NULL,'GRS','GRS2024-402',3100, false),
    (d6,'morganite','natural','none','Brazil','oval',6.80,NULL,'VVS',NULL,'GRS','GRS2024-403',1900, false),
    (d6,'garnet','natural','none','Tanzania','round',2.40,NULL,'VS',NULL,'GRS','GRS2024-404',1100, false),
    (d6,'tanzanite','natural','heat','Tanzania','cushion',4.50,NULL,'VS',NULL,'GRS','GRS2024-405',2700, false),
    (d6,'tourmaline','natural','none','Mozambique','emerald',8.10,NULL,'VS',NULL,'GRS','GRS2024-406',4200, true),
    (d1,'sapphire','natural','none','Madagascar','oval',3.20,NULL,'VS',NULL,'GRS','GRS2024-115',8400, false),
    (d4,'sapphire','natural','none','Sri Lanka','round',1.80,NULL,'VVS',NULL,'GRS','GRS2024-205',6100, false);

  -- Attach a default placeholder image to each stone
  INSERT INTO public.stone_images (stone_id, storage_url, sort_order, is_primary)
  SELECT s.id,
    CASE s.stone_type
      WHEN 'diamond' THEN 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200&q=80'
      WHEN 'ruby' THEN 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=1200&q=80'
      WHEN 'sapphire' THEN 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=1200&q=80'
      WHEN 'emerald' THEN 'https://images.unsplash.com/photo-1551122089-4e3e72477432?w=1200&q=80'
      WHEN 'spinel' THEN 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=1200&q=80'
      WHEN 'tourmaline' THEN 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=1200&q=80'
      WHEN 'aquamarine' THEN 'https://images.unsplash.com/photo-1551122089-4e3e72477432?w=1200&q=80'
      WHEN 'morganite' THEN 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200&q=80'
      WHEN 'garnet' THEN 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=1200&q=80'
      WHEN 'tanzanite' THEN 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=1200&q=80'
      ELSE 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=1200&q=80'
    END,
    0, true
  FROM public.stones s
  WHERE NOT EXISTS (SELECT 1 FROM public.stone_images i WHERE i.stone_id = s.id);
END $$;
