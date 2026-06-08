ALTER TABLE public.stone_images DROP CONSTRAINT IF EXISTS stone_images_stone_id_key;
NOTIFY pgrst, 'reload schema';