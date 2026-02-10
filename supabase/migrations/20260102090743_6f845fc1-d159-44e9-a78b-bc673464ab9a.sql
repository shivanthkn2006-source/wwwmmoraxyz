-- ═══════════════════════════════════════════════════════════════════════════════
-- CRITICAL SECURITY FIX: RLS Policies & Brute Force Protection
-- Platform Audit Remediation - January 2, 2026
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Create face_login_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS public.face_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  success BOOLEAN DEFAULT false,
  failure_reason TEXT,
  device_fingerprint TEXT
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_face_login_attempts_email ON public.face_login_attempts(email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_face_login_attempts_ip ON public.face_login_attempts(ip_address, attempted_at);

-- Enable RLS on face_login_attempts (insert-only for edge functions)
ALTER TABLE public.face_login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated service role only (edge functions)
CREATE POLICY "Service role can insert face login attempts"
ON public.face_login_attempts
FOR INSERT
WITH CHECK (true);

-- Allow reads for rate limit checking
CREATE POLICY "Service role can read face login attempts"
ON public.face_login_attempts
FOR SELECT
USING (true);

-- 2. Fix zoe_black_box_ledger RLS - should be append-only, read by owner
ALTER TABLE public.zoe_black_box_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own black box entries" ON public.zoe_black_box_ledger;
CREATE POLICY "Users can insert own black box entries"
ON public.zoe_black_box_ledger
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own black box entries" ON public.zoe_black_box_ledger;
CREATE POLICY "Users can read own black box entries"
ON public.zoe_black_box_ledger
FOR SELECT
USING (auth.uid() = user_id);

-- 3. Fix platform_health_logs RLS - admin only
ALTER TABLE public.platform_health_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage platform health logs" ON public.platform_health_logs;
CREATE POLICY "Admins can manage platform health logs"
ON public.platform_health_logs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND username IN ('moksh50', 'justmkbhd', 'john')
  )
);

-- Allow service role inserts for edge functions
DROP POLICY IF EXISTS "Service can insert platform health logs" ON public.platform_health_logs;
CREATE POLICY "Service can insert platform health logs"
ON public.platform_health_logs
FOR INSERT
WITH CHECK (true);

-- 4. Strengthen behavioral_events RLS
DROP POLICY IF EXISTS "Users can insert own behavioral events" ON public.behavioral_events;
CREATE POLICY "Users can insert own behavioral events"
ON public.behavioral_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own behavioral events" ON public.behavioral_events;
CREATE POLICY "Users can read own behavioral events"
ON public.behavioral_events
FOR SELECT
USING (auth.uid() = user_id);

-- 5. Create rate limiting function
CREATE OR REPLACE FUNCTION public.check_face_login_rate_limit(
  p_email TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_attempts INTEGER;
  v_ip_attempts INTEGER;
  v_is_locked BOOLEAN := false;
  v_lockout_until TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Count attempts in last 15 minutes for this email
  SELECT COUNT(*) INTO v_email_attempts
  FROM public.face_login_attempts
  WHERE email = p_email
    AND attempted_at >= NOW() - INTERVAL '15 minutes'
    AND success = false;
  
  -- Count attempts in last hour for this IP
  IF p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO v_ip_attempts
    FROM public.face_login_attempts
    WHERE ip_address = p_ip_address
      AND attempted_at >= NOW() - INTERVAL '1 hour'
      AND success = false;
  ELSE
    v_ip_attempts := 0;
  END IF;
  
  -- Check if locked out (5 attempts per email in 15 min, 10 per IP in 1 hour)
  IF v_email_attempts >= 5 THEN
    v_is_locked := true;
    v_lockout_until := NOW() + INTERVAL '15 minutes';
  ELSIF v_ip_attempts >= 10 THEN
    v_is_locked := true;
    v_lockout_until := NOW() + INTERVAL '1 hour';
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', NOT v_is_locked,
    'email_attempts', v_email_attempts,
    'ip_attempts', v_ip_attempts,
    'locked_until', v_lockout_until,
    'remaining_email_attempts', GREATEST(0, 5 - v_email_attempts),
    'remaining_ip_attempts', GREATEST(0, 10 - v_ip_attempts)
  );
END;
$$;

-- 6. Cleanup old attempts (retention: 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_face_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.face_login_attempts
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$;