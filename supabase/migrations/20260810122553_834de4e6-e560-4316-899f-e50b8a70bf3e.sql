ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS zoe_identity_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS zoe_identity_consent_at TIMESTAMPTZ;

CREATE POLICY "Users read own zoe identity files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'zoe-identity' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own zoe identity files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'zoe-identity' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own zoe identity files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'zoe-identity' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'zoe-identity' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own zoe identity files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'zoe-identity' AND auth.uid()::text = (storage.foldername(name))[1]);