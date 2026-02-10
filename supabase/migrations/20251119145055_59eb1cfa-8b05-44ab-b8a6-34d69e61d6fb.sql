-- Add relationship memory and emotional intelligence tables
CREATE TABLE IF NOT EXISTS public.lisa_relationship_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  memory_type TEXT NOT NULL, -- 'milestone', 'preference', 'emotion', 'conversation_topic'
  memory_content JSONB NOT NULL,
  emotional_weight INTEGER DEFAULT 5, -- 1-10 scale of emotional importance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_referenced TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reference_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.lisa_emotional_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  current_mood TEXT, -- 'happy', 'sad', 'excited', 'stressed', etc.
  emotional_context JSONB, -- Additional emotional metadata
  relationship_stage TEXT DEFAULT 'getting_to_know', -- 'getting_to_know', 'close_friend', 'romantic_partner', 'best_friend'
  intimacy_level INTEGER DEFAULT 3, -- 1-10 scale
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lisa_relationship_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lisa_emotional_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lisa_relationship_memory
CREATE POLICY "Users can view their own relationship memories"
  ON public.lisa_relationship_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own relationship memories"
  ON public.lisa_relationship_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own relationship memories"
  ON public.lisa_relationship_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own relationship memories"
  ON public.lisa_relationship_memory FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for lisa_emotional_state
CREATE POLICY "Users can view their own emotional state"
  ON public.lisa_emotional_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emotional state"
  ON public.lisa_emotional_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emotional state"
  ON public.lisa_emotional_state FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_relationship_memory_user ON public.lisa_relationship_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_relationship_memory_type ON public.lisa_relationship_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_emotional_state_user ON public.lisa_emotional_state(user_id);

-- Function to update emotional state timestamp
CREATE OR REPLACE FUNCTION update_emotional_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_emotional_state_timestamp_trigger
  BEFORE UPDATE ON public.lisa_emotional_state
  FOR EACH ROW
  EXECUTE FUNCTION update_emotional_state_timestamp();