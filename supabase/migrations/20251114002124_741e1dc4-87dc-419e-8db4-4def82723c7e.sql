-- Create table for AI companion chat messages
CREATE TABLE IF NOT EXISTS public.ai_companion_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_companion_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view their own AI companion messages"
ON public.ai_companion_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own messages
CREATE POLICY "Users can create their own AI companion messages"
ON public.ai_companion_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete their own AI companion messages"
ON public.ai_companion_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_companion_messages_user_id_created_at 
ON public.ai_companion_messages(user_id, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_companion_messages;