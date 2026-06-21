-- Account Security & Recovery System
-- Tables for 2FA, recovery methods, face verification, and security audit logs

-- Security Settings Table
CREATE TABLE IF NOT EXISTS public.user_security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  recovery_email TEXT,
  recovery_phone TEXT,
  face_verification_enabled BOOLEAN DEFAULT FALSE,
  face_verification_data JSONB,
  webauthn_enabled BOOLEAN DEFAULT FALSE,
  security_questions JSONB,
  last_password_change TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_security_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own security settings"
  ON public.user_security_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own security settings"
  ON public.user_security_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own security settings"
  ON public.user_security_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Recovery Tokens Table (for password reset, email change, etc.)
CREATE TABLE IF NOT EXISTS public.recovery_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_type TEXT NOT NULL, -- 'password_reset', 'email_change', 'phone_verification'
  token_hash TEXT NOT NULL,
  verification_code TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.recovery_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies (tokens should not be directly readable by users for security)
CREATE POLICY "Users cannot directly access recovery tokens"
  ON public.recovery_tokens FOR SELECT
  USING (FALSE);

-- Security Audit Log
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'login', 'password_change', '2fa_enabled', 'face_verification', etc.
  event_status TEXT NOT NULL, -- 'success', 'failed', 'suspicious'
  ip_address INET,
  user_agent TEXT,
  location TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own audit log"
  ON public.security_audit_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs"
  ON public.security_audit_log FOR INSERT
  WITH CHECK (TRUE);

-- WebAuthn Credentials Table (for passwordless authentication)
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  device_name TEXT,
  device_type TEXT, -- 'platform' (Face ID, Touch ID), 'cross-platform' (security key)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own credentials"
  ON public.webauthn_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credentials"
  ON public.webauthn_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials"
  ON public.webauthn_credentials FOR DELETE
  USING (auth.uid() = user_id);

-- Trusted Devices Table
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  trusted BOOLEAN DEFAULT TRUE,
  last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their trusted devices"
  ON public.trusted_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their trusted devices"
  ON public.trusted_devices FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_security_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_security_settings_timestamp
  BEFORE UPDATE ON public.user_security_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_security_settings_updated_at();

-- Indexes for performance
CREATE INDEX idx_recovery_tokens_user_id ON public.recovery_tokens(user_id);
CREATE INDEX idx_recovery_tokens_expires_at ON public.recovery_tokens(expires_at);
CREATE INDEX idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX idx_security_audit_log_created_at ON public.security_audit_log(created_at);
CREATE INDEX idx_webauthn_credentials_user_id ON public.webauthn_credentials(user_id);
CREATE INDEX idx_trusted_devices_user_id ON public.trusted_devices(user_id);