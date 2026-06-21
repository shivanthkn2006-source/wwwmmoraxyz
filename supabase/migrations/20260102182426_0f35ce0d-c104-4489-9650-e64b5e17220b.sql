-- Create system_health_logs table for crash logging (Phase 3: SysAdmin Zoe)
CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  log_type TEXT NOT NULL DEFAULT 'crash', -- 'crash', 'warning', 'recovery', 'auto_heal'
  screen_name TEXT,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_stack TEXT,
  severity TEXT NOT NULL DEFAULT 'critical', -- 'low', 'medium', 'high', 'critical'
  auto_heal_attempted BOOLEAN DEFAULT false,
  auto_heal_success BOOLEAN,
  auto_heal_action TEXT,
  device_info JSONB,
  session_id TEXT,
  url_path TEXT,
  admin_notified BOOLEAN DEFAULT false,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own logs
CREATE POLICY "Users can insert their own crash logs"
  ON public.system_health_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Admins can view all logs (for Saraswathi)
CREATE POLICY "Admins can view all system health logs"
  ON public.system_health_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.username ILIKE 'saraswathi' OR profiles.username ILIKE 'moksh50')
    )
  );

-- Policy: System can update logs (for marking admin_notified)
CREATE POLICY "System can update crash logs"
  ON public.system_health_logs
  FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Index for fast queries
CREATE INDEX idx_system_health_logs_created_at ON public.system_health_logs(created_at DESC);
CREATE INDEX idx_system_health_logs_severity ON public.system_health_logs(severity);
CREATE INDEX idx_system_health_logs_user_id ON public.system_health_logs(user_id);

COMMENT ON TABLE public.system_health_logs IS 'Phase 3: SysAdmin Zoe - Live monitoring crash logs for 500 Spartans beta';