-- Create table for Lisa command history
CREATE TABLE IF NOT EXISTS public.lisa_command_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  command TEXT NOT NULL,
  response TEXT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.lisa_command_history ENABLE ROW LEVEL SECURITY;

-- Policies for command history
CREATE POLICY "Users can view their own command history"
  ON public.lisa_command_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own command history"
  ON public.lisa_command_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own command history"
  ON public.lisa_command_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lisa_command_history_user_id_created_at 
  ON public.lisa_command_history(user_id, created_at DESC);

-- Add offline mode settings to lisa_settings if not exists
ALTER TABLE public.lisa_settings 
  ADD COLUMN IF NOT EXISTS offline_mode_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cached_responses JSONB DEFAULT '{}'::jsonb;