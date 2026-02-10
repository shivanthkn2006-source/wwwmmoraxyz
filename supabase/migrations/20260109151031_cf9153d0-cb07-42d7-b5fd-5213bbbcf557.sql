
-- Fix system_health_logs missing timestamp column
-- The code sends 'timestamp' but table only has 'created_at'
ALTER TABLE public.system_health_logs 
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT now();
