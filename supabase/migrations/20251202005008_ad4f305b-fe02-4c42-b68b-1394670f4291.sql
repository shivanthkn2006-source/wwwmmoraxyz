-- Create table for Zoe multi-agent tasks
CREATE TABLE IF NOT EXISTS public.zoe_multiagent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_name TEXT NOT NULL,
  command TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('autonomous', 'collaborative', 'adaptive', 'predictive')),
  response TEXT,
  agent_executions JSONB,
  coordination_log JSONB,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.zoe_multiagent_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own tasks"
  ON public.zoe_multiagent_tasks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
  ON public.zoe_multiagent_tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.zoe_multiagent_tasks
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.zoe_multiagent_tasks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_zoe_multiagent_tasks_user_id ON public.zoe_multiagent_tasks(user_id);
CREATE INDEX idx_zoe_multiagent_tasks_created_at ON public.zoe_multiagent_tasks(created_at DESC);

-- Update timestamp trigger
CREATE TRIGGER update_zoe_multiagent_tasks_updated_at
  BEFORE UPDATE ON public.zoe_multiagent_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();