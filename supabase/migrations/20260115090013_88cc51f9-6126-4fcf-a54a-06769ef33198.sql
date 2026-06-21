-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 4: ZOE INFINITY MEMORY - Persistent Conversation Memory
-- Stores conversation summaries, key facts, and relationship insights
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create zoe_infinity_memories table for storing conversation insights
CREATE TABLE IF NOT EXISTS public.zoe_infinity_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'fact', -- 'fact', 'preference', 'relationship', 'topic', 'insight'
  key TEXT NOT NULL, -- searchable key like "favorite_color" or "spouse_name"
  value TEXT NOT NULL, -- the actual memory content
  context TEXT, -- optional context for when/how this was learned
  importance_score INTEGER DEFAULT 5 CHECK (importance_score >= 1 AND importance_score <= 10),
  last_referenced_at TIMESTAMP WITH TIME ZONE,
  reference_count INTEGER DEFAULT 1,
  source_conversation_id UUID, -- optional link to conversation
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create zoe_infinity_conversations table for storing conversation summaries
CREATE TABLE IF NOT EXISTS public.zoe_infinity_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  summary TEXT, -- AI-generated summary of the conversation
  topics TEXT[], -- key topics discussed
  emotional_arc TEXT, -- overall emotional journey of the conversation
  key_insights TEXT[], -- important insights extracted
  message_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.zoe_infinity_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoe_infinity_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for memories
CREATE POLICY "Users can view their own memories" 
  ON public.zoe_infinity_memories 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memories" 
  ON public.zoe_infinity_memories 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" 
  ON public.zoe_infinity_memories 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories" 
  ON public.zoe_infinity_memories 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations" 
  ON public.zoe_infinity_conversations 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
  ON public.zoe_infinity_conversations 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
  ON public.zoe_infinity_conversations 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
  ON public.zoe_infinity_conversations 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_zoe_memories_user_id ON public.zoe_infinity_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_zoe_memories_key ON public.zoe_infinity_memories(key);
CREATE INDEX IF NOT EXISTS idx_zoe_memories_type ON public.zoe_infinity_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_zoe_memories_importance ON public.zoe_infinity_memories(importance_score DESC);

CREATE INDEX IF NOT EXISTS idx_zoe_conversations_user_id ON public.zoe_infinity_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_zoe_conversations_date ON public.zoe_infinity_conversations(session_date DESC);

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_zoe_memories_updated_at
  BEFORE UPDATE ON public.zoe_infinity_memories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();