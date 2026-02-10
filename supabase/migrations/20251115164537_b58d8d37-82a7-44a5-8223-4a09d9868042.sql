-- Create lisa_settings table with same structure as moe_settings
CREATE TABLE IF NOT EXISTS public.lisa_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wake_word TEXT NOT NULL DEFAULT 'hi lisa',
  enabled BOOLEAN DEFAULT true,
  voice TEXT DEFAULT 'aria',
  voice_gender TEXT DEFAULT 'female',
  voice_pitch NUMERIC DEFAULT 1.0,
  voice_rate NUMERIC DEFAULT 1.0,
  voice_volume NUMERIC DEFAULT 1.0,
  voice_feedback BOOLEAN DEFAULT true,
  sensitivity TEXT DEFAULT 'medium',
  output_mode TEXT DEFAULT 'both',
  language TEXT DEFAULT 'en-US',
  voice_warmth NUMERIC DEFAULT 0.7,
  voice_grain NUMERIC DEFAULT 0.5,
  voice_breath NUMERIC DEFAULT 0.4,
  voice_emotion NUMERIC DEFAULT 0.6,
  speech_style TEXT DEFAULT 'conversational',
  accent TEXT DEFAULT 'neutral',
  emotion_preset TEXT DEFAULT 'neutral',
  pause_duration NUMERIC DEFAULT 0.5,
  emphasis_level NUMERIC DEFAULT 0.5,
  voice_stability NUMERIC DEFAULT 0.5,
  voice_similarity_boost NUMERIC DEFAULT 0.75,
  voice_style NUMERIC DEFAULT 0.0,
  voice_use_speaker_boost BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT lisa_settings_user_id_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.lisa_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own Lisa settings"
  ON public.lisa_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Lisa settings"
  ON public.lisa_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Lisa settings"
  ON public.lisa_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add check constraints for valid ranges
ALTER TABLE public.lisa_settings
  ADD CONSTRAINT voice_stability_range CHECK (voice_stability >= 0 AND voice_stability <= 1),
  ADD CONSTRAINT voice_similarity_boost_range CHECK (voice_similarity_boost >= 0 AND voice_similarity_boost <= 1),
  ADD CONSTRAINT voice_style_range CHECK (voice_style >= 0 AND voice_style <= 1),
  ADD CONSTRAINT pause_duration_range CHECK (pause_duration >= 0 AND pause_duration <= 5),
  ADD CONSTRAINT emphasis_level_range CHECK (emphasis_level >= 0 AND emphasis_level <= 1);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lisa_settings_updated_at
  BEFORE UPDATE ON public.lisa_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();