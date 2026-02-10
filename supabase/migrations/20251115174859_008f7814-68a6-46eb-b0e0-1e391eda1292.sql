-- Add voice_mode column to lisa_settings table
ALTER TABLE public.lisa_settings 
ADD COLUMN IF NOT EXISTS voice_mode TEXT DEFAULT 'browser' CHECK (voice_mode IN ('browser', 'elevenlabs'));

COMMENT ON COLUMN public.lisa_settings.voice_mode IS 'Voice output mode: browser (Web Speech API) or elevenlabs (ElevenLabs TTS)';