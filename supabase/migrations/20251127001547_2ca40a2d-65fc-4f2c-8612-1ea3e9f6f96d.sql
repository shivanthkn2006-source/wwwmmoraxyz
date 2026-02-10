-- Create comprehensive behavioral tracking and personalization tables for Zoe AI

-- User behavioral patterns table
CREATE TABLE IF NOT EXISTS public.zoe_user_behavior (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Usage patterns
  daily_usage_patterns JSONB DEFAULT '{}',
  peak_usage_hours JSONB DEFAULT '[]',
  average_session_duration INTEGER DEFAULT 0,
  
  -- Interaction patterns
  voice_command_frequency INTEGER DEFAULT 0,
  text_interaction_frequency INTEGER DEFAULT 0,
  preferred_interaction_mode TEXT DEFAULT 'text',
  
  -- Content patterns
  post_types_created JSONB DEFAULT '{}',
  content_creation_times JSONB DEFAULT '[]',
  interests_engagement JSONB DEFAULT '{}',
  
  -- Location and network patterns
  common_locations JSONB DEFAULT '[]',
  network_type_usage JSONB DEFAULT '{"wifi": 0, "cellular": 0}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Zoe conversation sessions table
CREATE TABLE IF NOT EXISTS public.zoe_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name TEXT,
  session_type TEXT DEFAULT 'general', -- general, business, personal, shopping, etc.
  session_context JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zoe messages table
CREATE TABLE IF NOT EXISTS public.zoe_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.zoe_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- text, voice, image, video
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zoe personalization preferences table
CREATE TABLE IF NOT EXISTS public.zoe_personalization (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personalization data
  interests_weights JSONB DEFAULT '{}',
  content_preferences JSONB DEFAULT '{}',
  communication_style TEXT DEFAULT 'balanced', -- casual, professional, balanced, friendly
  response_length_preference TEXT DEFAULT 'medium', -- short, medium, detailed
  
  -- Predictions
  predicted_interests JSONB DEFAULT '[]',
  predicted_behaviors JSONB DEFAULT '{}',
  next_likely_actions JSONB DEFAULT '[]',
  
  -- Business automation settings
  business_mode_enabled BOOLEAN DEFAULT false,
  automation_preferences JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Zoe memory and context table
CREATE TABLE IF NOT EXISTS public.zoe_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL, -- fact, preference, event, task, goal
  memory_content TEXT NOT NULL,
  importance_score INTEGER DEFAULT 5, -- 1-10
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  related_contexts JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.zoe_user_behavior ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoe_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoe_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoe_personalization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoe_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for zoe_user_behavior
CREATE POLICY "Users can view their own behavior data"
  ON public.zoe_user_behavior FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own behavior data"
  ON public.zoe_user_behavior FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own behavior data"
  ON public.zoe_user_behavior FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for zoe_sessions
CREATE POLICY "Users can view their own sessions"
  ON public.zoe_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON public.zoe_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.zoe_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.zoe_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for zoe_messages
CREATE POLICY "Users can view their own messages"
  ON public.zoe_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages"
  ON public.zoe_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for zoe_personalization
CREATE POLICY "Users can view their own personalization"
  ON public.zoe_personalization FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own personalization"
  ON public.zoe_personalization FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own personalization"
  ON public.zoe_personalization FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for zoe_memory
CREATE POLICY "Users can view their own memories"
  ON public.zoe_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memories"
  ON public.zoe_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories"
  ON public.zoe_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
  ON public.zoe_memory FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_zoe_user_behavior_updated_at
  BEFORE UPDATE ON public.zoe_user_behavior
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zoe_sessions_updated_at
  BEFORE UPDATE ON public.zoe_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zoe_personalization_updated_at
  BEFORE UPDATE ON public.zoe_personalization
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_zoe_user_behavior_user_id ON public.zoe_user_behavior(user_id);
CREATE INDEX idx_zoe_sessions_user_id ON public.zoe_sessions(user_id);
CREATE INDEX idx_zoe_sessions_is_active ON public.zoe_sessions(is_active);
CREATE INDEX idx_zoe_messages_session_id ON public.zoe_messages(session_id);
CREATE INDEX idx_zoe_messages_user_id ON public.zoe_messages(user_id);
CREATE INDEX idx_zoe_personalization_user_id ON public.zoe_personalization(user_id);
CREATE INDEX idx_zoe_memory_user_id ON public.zoe_memory(user_id);
CREATE INDEX idx_zoe_memory_importance ON public.zoe_memory(importance_score DESC);