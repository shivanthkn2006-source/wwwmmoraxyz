-- Create table to track which features have been announced to which users
CREATE TABLE IF NOT EXISTS public.feature_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature_id TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  announced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_id)
);

-- Enable RLS
ALTER TABLE public.feature_announcements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own feature announcements"
  ON public.feature_announcements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feature announcements"
  ON public.feature_announcements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_feature_announcements_user_feature 
  ON public.feature_announcements(user_id, feature_id);