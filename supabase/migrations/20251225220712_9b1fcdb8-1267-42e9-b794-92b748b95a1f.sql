-- ═══════════════════════════════════════════════════════════════════════════════
-- CORTICAL STACK MEMORIES - Zoe's Memory Stream for DHF
-- Stores conversation memories with sentiment analysis for timeline visualization
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create the cortical stack memories table
CREATE TABLE public.cortical_stack_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'assistant')),
  sentiment_score FLOAT DEFAULT 0 CHECK (sentiment_score >= -1.0 AND sentiment_score <= 1.0),
  is_breakthrough BOOLEAN DEFAULT false,
  summary TEXT,
  tags TEXT[] DEFAULT '{}',
  emotional_context JSONB DEFAULT '{}',
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_cortical_memories_user_id ON public.cortical_stack_memories(user_id);
CREATE INDEX idx_cortical_memories_created_at ON public.cortical_stack_memories(created_at DESC);
CREATE INDEX idx_cortical_memories_sentiment ON public.cortical_stack_memories(sentiment_score);
CREATE INDEX idx_cortical_memories_breakthrough ON public.cortical_stack_memories(is_breakthrough) WHERE is_breakthrough = true;

-- Enable Row Level Security
ALTER TABLE public.cortical_stack_memories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - users can only access their own memories
CREATE POLICY "Users can view their own memories" 
ON public.cortical_stack_memories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memories" 
ON public.cortical_stack_memories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" 
ON public.cortical_stack_memories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories" 
ON public.cortical_stack_memories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cortical_memories_updated_at
BEFORE UPDATE ON public.cortical_stack_memories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.cortical_stack_memories IS 'Stores Zoe conversation memories with sentiment analysis for the Memory Stream timeline visualization';