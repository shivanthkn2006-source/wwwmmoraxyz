-- ═══════════════════════════════════════════════════════════════════════════════
-- PROTOCOL WISDOM - GOAL HIERARCHY TABLES
-- IBM Intelligence Model: Macro (WHY) + Micro (HOW) Goals
-- ═══════════════════════════════════════════════════════════════════════════════

-- Macro Goals: User-defined North Star goals (AI-protected)
CREATE TABLE public.wisdom_macro_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  purpose TEXT NOT NULL,
  target_date TIMESTAMP WITH TIME ZONE,
  domain TEXT NOT NULL DEFAULT 'lifestyle',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  milestones JSONB DEFAULT '[]'::jsonb,
  emotional_anchors TEXT[] DEFAULT '{}',
  is_locked BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Micro Goals: AI-generated actionable tasks from macros
CREATE TABLE public.wisdom_micro_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  parent_macro_id UUID REFERENCES public.wisdom_macro_goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  action_type TEXT NOT NULL DEFAULT 'other',
  priority TEXT NOT NULL DEFAULT 'today',
  effort TEXT NOT NULL DEFAULT 'quick',
  status TEXT NOT NULL DEFAULT 'pending',
  wisdom_score INTEGER DEFAULT 0,
  wisdom_reasoning TEXT,
  estimated_impact NUMERIC DEFAULT 0,
  suggested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.wisdom_macro_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wisdom_micro_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Macro Goals
CREATE POLICY "Users can view their own macro goals" 
ON public.wisdom_macro_goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own macro goals" 
ON public.wisdom_macro_goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own macro goals" 
ON public.wisdom_macro_goals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own macro goals" 
ON public.wisdom_macro_goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for Micro Goals
CREATE POLICY "Users can view their own micro goals" 
ON public.wisdom_micro_goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own micro goals" 
ON public.wisdom_micro_goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own micro goals" 
ON public.wisdom_micro_goals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own micro goals" 
ON public.wisdom_micro_goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_wisdom_macro_goals_user ON public.wisdom_macro_goals(user_id);
CREATE INDEX idx_wisdom_macro_goals_status ON public.wisdom_macro_goals(status);
CREATE INDEX idx_wisdom_micro_goals_user ON public.wisdom_micro_goals(user_id);
CREATE INDEX idx_wisdom_micro_goals_parent ON public.wisdom_micro_goals(parent_macro_id);
CREATE INDEX idx_wisdom_micro_goals_status ON public.wisdom_micro_goals(status);
CREATE INDEX idx_wisdom_micro_goals_priority ON public.wisdom_micro_goals(priority);

-- Trigger for updating updated_at on macro goals
CREATE TRIGGER update_wisdom_macro_goals_updated_at
BEFORE UPDATE ON public.wisdom_macro_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();