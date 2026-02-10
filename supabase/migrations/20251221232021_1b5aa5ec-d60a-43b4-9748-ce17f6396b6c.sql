-- Security Logs Table for tracking intrusion attempts and shadow bans
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  event_type TEXT NOT NULL,
  event_details JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shadow Ban Status Table
CREATE TABLE IF NOT EXISTS public.shadow_ban_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ip_address TEXT,
  is_shadow_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  strike_count INTEGER DEFAULT 0,
  banned_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shadow_ban_status ENABLE ROW LEVEL SECURITY;

-- Security logs: Only admins can read all, users can't see anything
CREATE POLICY "Admins can view all security logs"
ON public.security_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow system to insert security logs
CREATE POLICY "System can insert security logs"
ON public.security_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Shadow ban status: Only admins can view
CREATE POLICY "Admins can view shadow ban status"
ON public.shadow_ban_status
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow system to manage shadow bans
CREATE POLICY "System can manage shadow bans"
ON public.shadow_ban_status
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Function to check and apply shadow ban (three-strike rule)
CREATE OR REPLACE FUNCTION public.check_shadow_ban_threshold(p_user_id UUID, p_ip_address TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_strike_count INTEGER;
  v_should_ban BOOLEAN := false;
  v_result JSONB;
BEGIN
  -- Count intrusion attempts in last hour
  SELECT COUNT(*) INTO v_strike_count
  FROM public.security_logs
  WHERE (user_id = p_user_id OR (p_ip_address IS NOT NULL AND ip_address = p_ip_address))
    AND event_type IN ('intrusion_attempt', 'devtools_intrusion', 'context_menu', 'keyboard_shortcut')
    AND created_at >= NOW() - INTERVAL '1 hour';
  
  -- Check if threshold exceeded (3 strikes)
  IF v_strike_count >= 3 THEN
    v_should_ban := true;
    
    -- Insert or update shadow ban status
    INSERT INTO public.shadow_ban_status (user_id, ip_address, is_shadow_banned, ban_reason, strike_count, banned_at)
    VALUES (p_user_id, p_ip_address, true, 'Three-strike rule triggered', v_strike_count, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      is_shadow_banned = true,
      strike_count = EXCLUDED.strike_count,
      ban_reason = EXCLUDED.ban_reason,
      banned_at = NOW(),
      updated_at = NOW();
  ELSE
    -- Update strike count without banning
    INSERT INTO public.shadow_ban_status (user_id, ip_address, strike_count)
    VALUES (p_user_id, p_ip_address, v_strike_count)
    ON CONFLICT (user_id) DO UPDATE SET
      strike_count = EXCLUDED.strike_count,
      updated_at = NOW();
  END IF;
  
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'strike_count', v_strike_count,
    'is_shadow_banned', v_should_ban,
    'checked_at', NOW()
  );
  
  RETURN v_result;
END;
$$;

-- Function to check if user is shadow banned
CREATE OR REPLACE FUNCTION public.is_user_shadow_banned(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_banned BOOLEAN;
BEGIN
  SELECT is_shadow_banned INTO v_is_banned
  FROM public.shadow_ban_status
  WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > NOW());
  
  RETURN COALESCE(v_is_banned, false);
END;
$$;

-- Trigger to auto-check shadow ban on security log insert
CREATE OR REPLACE FUNCTION public.auto_check_shadow_ban_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only check for intrusion-related events
  IF NEW.event_type IN ('intrusion_attempt', 'devtools_intrusion', 'context_menu', 'keyboard_shortcut') THEN
    PERFORM check_shadow_ban_threshold(NEW.user_id, NEW.ip_address);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS security_log_shadow_ban_check ON public.security_logs;
CREATE TRIGGER security_log_shadow_ban_check
AFTER INSERT ON public.security_logs
FOR EACH ROW
EXECUTE FUNCTION public.auto_check_shadow_ban_trigger();

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_security_logs_user_created ON public.security_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip ON public.security_logs(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shadow_ban_user ON public.shadow_ban_status(user_id);
CREATE INDEX IF NOT EXISTS idx_shadow_ban_ip ON public.shadow_ban_status(ip_address);