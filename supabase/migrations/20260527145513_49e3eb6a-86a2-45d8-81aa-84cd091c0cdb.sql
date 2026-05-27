DO $$
DECLARE
  v_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_ids FROM public.profiles WHERE email LIKE '%@chaos-demo.invalid';
  IF v_ids IS NULL OR array_length(v_ids, 1) = 0 THEN
    RAISE NOTICE 'No demo accounts to remove';
    RETURN;
  END IF;
  DELETE FROM public.stone_images WHERE stone_id IN (SELECT id FROM public.stones WHERE dealer_id = ANY(v_ids));
  DELETE FROM public.feed_selections WHERE stone_id IN (SELECT id FROM public.stones WHERE dealer_id = ANY(v_ids));
  DELETE FROM public.stones WHERE dealer_id = ANY(v_ids);
  DELETE FROM public.dealer_follows WHERE dealer_id = ANY(v_ids);
  DELETE FROM public.enquiry_messages WHERE enquiry_id IN (SELECT id FROM public.enquiries WHERE to_dealer_id = ANY(v_ids));
  DELETE FROM public.enquiries WHERE to_dealer_id = ANY(v_ids);
  DELETE FROM public.dealer_profiles WHERE id = ANY(v_ids);
  DELETE FROM public.profiles WHERE id = ANY(v_ids);
  DELETE FROM auth.users WHERE id = ANY(v_ids);
END $$;