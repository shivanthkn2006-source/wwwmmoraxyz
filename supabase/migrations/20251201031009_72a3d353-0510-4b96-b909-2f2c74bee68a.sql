-- God Mode Platform Health Monitoring System

-- Table for platform health logs
CREATE TABLE IF NOT EXISTS public.platform_health_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical')),
  issues_count INTEGER NOT NULL DEFAULT 0,
  critical_issues INTEGER NOT NULL DEFAULT 0,
  scan_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_health_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own health logs"
  ON public.platform_health_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own health logs"
  ON public.platform_health_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_platform_health_user_created ON public.platform_health_logs(user_id, created_at DESC);
CREATE INDEX idx_platform_health_status ON public.platform_health_logs(status, created_at DESC);