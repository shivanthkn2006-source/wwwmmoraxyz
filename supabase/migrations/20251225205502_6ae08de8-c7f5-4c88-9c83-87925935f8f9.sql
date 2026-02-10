-- Add RLS policies for occult-biometrics storage bucket
CREATE POLICY "Users can upload their own occult biometrics"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'occult-biometrics' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own occult biometrics"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'occult-biometrics' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own occult biometrics"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'occult-biometrics' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin can view all biometrics (for Moksh50)
CREATE POLICY "Admin can view all occult biometrics"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'occult-biometrics' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.username = 'moksh50'
  )
);

-- Clean up duplicate RLS policies on webauthn_credentials
DROP POLICY IF EXISTS "Users can view their own credentials" ON webauthn_credentials;
DROP POLICY IF EXISTS "Users can insert their own credentials" ON webauthn_credentials;
DROP POLICY IF EXISTS "Users can delete their own credentials" ON webauthn_credentials;