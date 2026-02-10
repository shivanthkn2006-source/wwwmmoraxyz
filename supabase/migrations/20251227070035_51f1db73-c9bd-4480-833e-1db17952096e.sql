-- Security Breaches Table for Fortress Protocol
CREATE TABLE public.security_breaches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  breach_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  details TEXT,
  ip_address TEXT,
  device_fingerprint TEXT,
  invite_code TEXT,
  action_taken TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_breaches ENABLE ROW LEVEL SECURITY;

-- Only admins can view breaches
CREATE POLICY "Admins can view all breaches" 
ON public.security_breaches 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND LOWER(profiles.username) IN ('moksh50', 'justmkbhd', 'john')
  )
);

-- System can insert breaches
CREATE POLICY "Authenticated users can log their own breaches" 
ON public.security_breaches 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Online Sessions for real-time tracking
CREATE TABLE public.online_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_token TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_heartbeat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  device_info JSONB,
  flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.online_sessions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own sessions
CREATE POLICY "Users can manage own sessions" 
ON public.online_sessions 
FOR ALL 
USING (auth.uid() = user_id);

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions" 
ON public.online_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND LOWER(profiles.username) IN ('moksh50', 'justmkbhd', 'john')
  )
);

-- Admins can update any session (for kill switch)
CREATE POLICY "Admins can update any session" 
ON public.online_sessions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND LOWER(profiles.username) IN ('moksh50', 'justmkbhd', 'john')
  )
);

-- Add revoked_reason column to invite_codes if not exists
ALTER TABLE public.invite_codes ADD COLUMN IF NOT EXISTS revoked_reason TEXT;
ALTER TABLE public.invite_codes ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.invite_codes ADD COLUMN IF NOT EXISTS revoked_by UUID;

-- Enable realtime for online_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.online_sessions;