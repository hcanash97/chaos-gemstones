
CREATE POLICY "dealers upload own certs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'cert-scans'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "dealers read own certs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'cert-scans'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "dealers update own certs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'cert-scans'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "dealers delete own certs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'cert-scans'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
