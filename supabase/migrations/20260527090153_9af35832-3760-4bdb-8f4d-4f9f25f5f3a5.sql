
-- Storage policies for stone-images bucket: dealers manage objects under their own uid/ prefix
CREATE POLICY "dealers upload own stone images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stone-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "dealers update own stone images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stone-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "dealers delete own stone images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'stone-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
