
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='avatars' AND (split_part(name,'/',1)=auth.uid()::text OR name LIKE auth.uid()::text||'.%' OR name LIKE auth.uid()::text||'-%'));
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='avatars' AND (split_part(name,'/',1)=auth.uid()::text OR name LIKE auth.uid()::text||'.%' OR name LIKE auth.uid()::text||'-%'))
WITH CHECK (bucket_id='avatars' AND (split_part(name,'/',1)=auth.uid()::text OR name LIKE auth.uid()::text||'.%' OR name LIKE auth.uid()::text||'-%'));
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='avatars' AND (split_part(name,'/',1)=auth.uid()::text OR name LIKE auth.uid()::text||'.%' OR name LIKE auth.uid()::text||'-%'));

DROP POLICY IF EXISTS "Users can update their own biometric files" ON storage.objects;
CREATE POLICY "Users can update their own biometric files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='occult-biometrics' AND auth.uid()::text=(storage.foldername(name))[1])
WITH CHECK (bucket_id='occult-biometrics' AND auth.uid()::text=(storage.foldername(name))[1]);
