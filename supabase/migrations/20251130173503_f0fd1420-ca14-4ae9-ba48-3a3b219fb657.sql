-- Add huddle_usage_patterns column to zoe_user_behavior table
ALTER TABLE public.zoe_user_behavior 
ADD COLUMN IF NOT EXISTS huddle_usage_patterns jsonb DEFAULT '{}'::jsonb;