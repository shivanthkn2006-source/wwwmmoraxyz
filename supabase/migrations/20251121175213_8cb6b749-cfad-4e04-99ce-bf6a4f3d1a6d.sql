-- Create important_dates table for tracking special occasions
CREATE TABLE IF NOT EXISTS public.important_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_type TEXT NOT NULL,
  date_value DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT true,
  friend_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster date queries
CREATE INDEX idx_important_dates_user_date ON public.important_dates(user_id, date_value);
CREATE INDEX idx_important_dates_date ON public.important_dates(date_value);

-- Enable RLS
ALTER TABLE public.important_dates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own important dates"
  ON public.important_dates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own important dates"
  ON public.important_dates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own important dates"
  ON public.important_dates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own important dates"
  ON public.important_dates FOR DELETE
  USING (auth.uid() = user_id);

-- Create voice shortcuts table for multi-step commands
CREATE TABLE IF NOT EXISTS public.voice_shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shortcut_name TEXT NOT NULL,
  trigger_phrase TEXT NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for shortcuts
CREATE INDEX idx_voice_shortcuts_user ON public.voice_shortcuts(user_id);
CREATE INDEX idx_voice_shortcuts_trigger ON public.voice_shortcuts(user_id, trigger_phrase);

-- Enable RLS
ALTER TABLE public.voice_shortcuts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own shortcuts"
  ON public.voice_shortcuts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shortcuts"
  ON public.voice_shortcuts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shortcuts"
  ON public.voice_shortcuts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shortcuts"
  ON public.voice_shortcuts FOR DELETE
  USING (auth.uid() = user_id);

-- Function to get upcoming important dates
CREATE OR REPLACE FUNCTION public.get_upcoming_important_dates(user_uuid UUID, days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
  id UUID,
  date_type TEXT,
  date_value DATE,
  title TEXT,
  description TEXT,
  friend_user_id UUID,
  days_until INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.date_type,
    d.date_value,
    d.title,
    d.description,
    d.friend_user_id,
    (d.date_value - CURRENT_DATE)::INTEGER as days_until
  FROM public.important_dates d
  WHERE d.user_id = user_uuid
    AND d.date_value BETWEEN CURRENT_DATE AND (CURRENT_DATE + days_ahead)
  ORDER BY d.date_value ASC;
END;
$$;

-- Function to increment shortcut execution count
CREATE OR REPLACE FUNCTION public.increment_shortcut_execution(shortcut_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.voice_shortcuts
  SET execution_count = execution_count + 1,
      updated_at = now()
  WHERE id = shortcut_uuid;
END;
$$;