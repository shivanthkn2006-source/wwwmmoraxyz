-- Create the Universal Truth Ledger table
CREATE TABLE IF NOT EXISTS public.universal_truth_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  truth_key TEXT NOT NULL,
  truth_value TEXT NOT NULL,
  truth_category TEXT NOT NULL DEFAULT 'general',
  confidence_score NUMERIC DEFAULT 0.8,
  source_message_ids TEXT[] DEFAULT '{}',
  first_observed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  confirmation_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, truth_key)
);

-- Create the Sovereign Context table (current state tracking)
CREATE TABLE IF NOT EXISTS public.sovereign_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_project TEXT,
  current_mood TEXT,
  current_focus TEXT,
  active_goals JSONB DEFAULT '[]',
  recent_topics TEXT[] DEFAULT '{}',
  relationship_map JSONB DEFAULT '{}',
  preferences_snapshot JSONB DEFAULT '{}',
  last_scribe_run_at TIMESTAMP WITH TIME ZONE,
  message_count_since_scribe INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_truth_ledger_user_category ON public.universal_truth_ledger(user_id, truth_category);
CREATE INDEX IF NOT EXISTS idx_truth_ledger_active ON public.universal_truth_ledger(user_id, is_active);

-- Enable RLS
ALTER TABLE public.universal_truth_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sovereign_context ENABLE ROW LEVEL SECURITY;

-- RLS Policies for universal_truth_ledger
CREATE POLICY "Users can view their own truths"
  ON public.universal_truth_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own truths"
  ON public.universal_truth_ledger FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own truths"
  ON public.universal_truth_ledger FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for sovereign_context
CREATE POLICY "Users can view their own context"
  ON public.sovereign_context FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own context"
  ON public.sovereign_context FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own context"
  ON public.sovereign_context FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_truth_ledger_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_truth_ledger_updated_at
  BEFORE UPDATE ON public.universal_truth_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_truth_ledger_timestamp();

CREATE TRIGGER update_sovereign_context_updated_at
  BEFORE UPDATE ON public.sovereign_context
  FOR EACH ROW EXECUTE FUNCTION public.update_truth_ledger_timestamp();