-- Enable pgvector extension for semantic memory search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the memories table (Cortical Stack)
CREATE TABLE IF NOT EXISTS public.mmora_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'user' CHECK (type IN ('user', 'zoe')),
  emotion_tag TEXT,
  embedding vector(1536),
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster vector similarity search
CREATE INDEX IF NOT EXISTS mmora_memories_embedding_idx ON public.mmora_memories 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create index for user queries
CREATE INDEX IF NOT EXISTS mmora_memories_user_idx ON public.mmora_memories(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.mmora_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own memories
CREATE POLICY "Users can view their own memories"
ON public.mmora_memories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories"
ON public.mmora_memories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
ON public.mmora_memories FOR DELETE
USING (auth.uid() = user_id);

-- Function to search memories by similarity (RAG)
CREATE OR REPLACE FUNCTION public.search_mmora_memories(
  query_embedding vector(1536),
  match_user_id UUID,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  type TEXT,
  emotion_tag TEXT,
  similarity FLOAT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.type,
    m.emotion_tag,
    1 - (m.embedding <=> query_embedding) AS similarity,
    m.created_at
  FROM public.mmora_memories m
  WHERE m.user_id = match_user_id
    AND m.embedding IS NOT NULL
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;