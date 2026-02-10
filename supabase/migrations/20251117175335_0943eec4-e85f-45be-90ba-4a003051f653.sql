-- Create voice macros table for custom command sequences
CREATE TABLE IF NOT EXISTS public.voice_macros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  macro_name TEXT NOT NULL,
  trigger_phrase TEXT NOT NULL,
  commands JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Lisa learning preferences table
CREATE TABLE IF NOT EXISTS public.lisa_learning_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  learning_enabled BOOLEAN DEFAULT true,
  command_preferences JSONB DEFAULT '{}'::jsonb,
  response_patterns JSONB DEFAULT '{}'::jsonb,
  interaction_stats JSONB DEFAULT '{}'::jsonb,
  last_learning_update TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add multi-language support columns to lisa_settings
ALTER TABLE public.lisa_settings
ADD COLUMN IF NOT EXISTS auto_detect_language BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en-US';

-- Enable RLS
ALTER TABLE public.voice_macros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lisa_learning_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voice_macros
CREATE POLICY "Users can view their own voice macros"
ON public.voice_macros FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice macros"
ON public.voice_macros FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice macros"
ON public.voice_macros FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice macros"
ON public.voice_macros FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for lisa_learning_preferences
CREATE POLICY "Users can view their own learning preferences"
ON public.lisa_learning_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning preferences"
ON public.lisa_learning_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning preferences"
ON public.lisa_learning_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_macros_user_id ON public.voice_macros(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_macros_trigger ON public.voice_macros(trigger_phrase);
CREATE INDEX IF NOT EXISTS idx_lisa_learning_user_id ON public.lisa_learning_preferences(user_id);

-- Create function to update voice macro execution count
CREATE OR REPLACE FUNCTION public.increment_macro_execution(macro_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.voice_macros
  SET execution_count = execution_count + 1,
      updated_at = now()
  WHERE id = macro_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_voice_macro_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_voice_macros_updated_at
BEFORE UPDATE ON public.voice_macros
FOR EACH ROW
EXECUTE FUNCTION public.update_voice_macro_timestamp();

CREATE TRIGGER update_lisa_learning_updated_at
BEFORE UPDATE ON public.lisa_learning_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_voice_macro_timestamp();