-- Repair Data API grants for existing biometric/security tables that already have RLS policies
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webauthn_credentials TO authenticated;
GRANT ALL ON public.webauthn_credentials TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_print_enrollments TO authenticated;
GRANT ALL ON public.voice_print_enrollments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_security_settings TO authenticated;
GRANT ALL ON public.user_security_settings TO service_role;

GRANT INSERT ON public.face_login_attempts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.face_login_attempts TO service_role;

GRANT INSERT ON public.biometric_auth_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biometric_auth_events TO service_role;

GRANT SELECT, INSERT ON public.security_audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_audit_log TO service_role;

-- Secure passkey challenge lifecycle for WebAuthn begin/complete flows
CREATE TABLE IF NOT EXISTS public.passkey_auth_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('register', 'authenticate')),
  challenge TEXT NOT NULL,
  credential_id TEXT,
  origin TEXT,
  user_agent TEXT,
  platform TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  consumed_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.passkey_auth_challenges TO service_role;

ALTER TABLE public.passkey_auth_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages passkey challenges" ON public.passkey_auth_challenges;
CREATE POLICY "Service role manages passkey challenges"
ON public.passkey_auth_challenges
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_passkey_auth_challenges_user_operation
ON public.passkey_auth_challenges(user_id, operation, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_passkey_auth_challenges_expires_at
ON public.passkey_auth_challenges(expires_at);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id
ON public.webauthn_credentials(credential_id);

-- Ensure update/delete policies exist for credential maintenance.
DROP POLICY IF EXISTS "Users can update their own webauthn credentials" ON public.webauthn_credentials;
CREATE POLICY "Users can update their own webauthn credentials"
ON public.webauthn_credentials
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);