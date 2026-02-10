-- Create table for voice assistant visibility settings and custom commands
CREATE TABLE IF NOT EXISTS public.voice_assistant_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lisa_visible BOOLEAN NOT NULL DEFAULT true,
  moe_visible BOOLEAN NOT NULL DEFAULT true,
  lisa_custom_commands JSONB DEFAULT '[]'::jsonb,
  moe_custom_commands JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.voice_assistant_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own voice assistant settings"
  ON public.voice_assistant_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice assistant settings"
  ON public.voice_assistant_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice assistant settings"
  ON public.voice_assistant_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_voice_assistant_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_voice_assistant_settings_updated_at
  BEFORE UPDATE ON public.voice_assistant_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_assistant_settings_updated_at();