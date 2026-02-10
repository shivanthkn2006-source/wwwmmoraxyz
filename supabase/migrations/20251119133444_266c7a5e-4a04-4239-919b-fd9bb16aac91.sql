-- Add Lisa personality settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS lisa_personality_tone TEXT DEFAULT 'friendly' CHECK (lisa_personality_tone IN ('casual', 'professional', 'enthusiastic', 'friendly')),
ADD COLUMN IF NOT EXISTS lisa_conversation_style TEXT DEFAULT 'balanced' CHECK (lisa_conversation_style IN ('concise', 'balanced', 'detailed')),
ADD COLUMN IF NOT EXISTS lisa_proactive_suggestions BOOLEAN DEFAULT true;

-- Create table for tracking user activity patterns for proactive suggestions
CREATE TABLE IF NOT EXISTS public.user_activity_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_post_date TIMESTAMP WITH TIME ZONE,
  average_posts_per_week INTEGER DEFAULT 0,
  last_login_date TIMESTAMP WITH TIME ZONE,
  last_huddle_visit TIMESTAMP WITH TIME ZONE,
  last_chat_date TIMESTAMP WITH TIME ZONE,
  nearby_friends_notified JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_activity_patterns ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_activity_patterns
CREATE POLICY "Users can view their own activity patterns"
  ON public.user_activity_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity patterns"
  ON public.user_activity_patterns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity patterns"
  ON public.user_activity_patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to update activity patterns automatically
CREATE OR REPLACE FUNCTION update_activity_pattern_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for activity patterns
CREATE TRIGGER update_activity_patterns_updated_at
  BEFORE UPDATE ON public.user_activity_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_pattern_timestamp();