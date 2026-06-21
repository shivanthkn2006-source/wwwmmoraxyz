-- Create table for tracking contextual hints shown to users
CREATE TABLE IF NOT EXISTS public.user_hints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hint_key TEXT NOT NULL,
  shown_count INTEGER DEFAULT 1,
  last_shown_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, hint_key)
);

-- Enable RLS
ALTER TABLE public.user_hints ENABLE ROW LEVEL SECURITY;

-- Policies for user hints
CREATE POLICY "Users can view their own hints"
  ON public.user_hints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hints"
  ON public.user_hints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own hints"
  ON public.user_hints FOR UPDATE
  USING (auth.uid() = user_id);

-- Add notification settings to profiles for voice announcements
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS voice_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_voice_style TEXT DEFAULT 'friendly';

-- Create function to check if hint should be shown
CREATE OR REPLACE FUNCTION should_show_hint(
  p_user_id UUID,
  p_hint_key TEXT,
  p_max_count INTEGER DEFAULT 3
)
RETURNS BOOLEAN AS $$
DECLARE
  v_hint_record RECORD;
BEGIN
  SELECT * INTO v_hint_record
  FROM public.user_hints
  WHERE user_id = p_user_id AND hint_key = p_hint_key;
  
  -- If no record, should show
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  -- If dismissed, don't show
  IF v_hint_record.dismissed THEN
    RETURN false;
  END IF;
  
  -- If shown count is less than max, should show
  IF v_hint_record.shown_count < p_max_count THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;