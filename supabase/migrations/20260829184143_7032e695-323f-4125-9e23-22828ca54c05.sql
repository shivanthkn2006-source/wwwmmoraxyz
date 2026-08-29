
DROP POLICY IF EXISTS "Admin can view all occult biometrics" ON storage.objects;
CREATE POLICY "Admin can view all occult biometrics" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'occult-biometrics' AND public.has_role(auth.uid(),'admin'::app_role));
