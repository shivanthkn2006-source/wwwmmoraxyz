-- Create reminders table for smart notifications
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reminder_time TIMESTAMPTZ NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('event', 'birthday', 'task', 'custom')),
  related_id UUID, -- Can link to events, profiles, etc.
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- daily, weekly, monthly, yearly
  is_completed BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reminders
CREATE POLICY "Users can view their own reminders"
  ON public.reminders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminders"
  ON public.reminders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
  ON public.reminders
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
  ON public.reminders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add language preference to lisa_settings
ALTER TABLE public.lisa_settings 
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en-US',
ADD COLUMN IF NOT EXISTS auto_detect_language BOOLEAN DEFAULT true;

-- Create index for faster reminder queries
CREATE INDEX IF NOT EXISTS idx_reminders_user_time 
  ON public.reminders(user_id, reminder_time) 
  WHERE is_completed = false AND is_sent = false;

-- Add trigger for updated_at
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();