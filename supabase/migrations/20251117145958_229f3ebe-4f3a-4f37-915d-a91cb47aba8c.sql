-- Add category column to reminders table
ALTER TABLE reminders ADD COLUMN category text DEFAULT 'personal';

-- Create emotion_logs table for tracking user emotions
CREATE TABLE public.emotion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emotion text NOT NULL,
  intensity integer NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
  notes text,
  context text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.emotion_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emotion_logs
CREATE POLICY "Users can create their own emotion logs"
  ON public.emotion_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own emotion logs"
  ON public.emotion_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own emotion logs"
  ON public.emotion_logs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emotion logs"
  ON public.emotion_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_emotion_logs_user_time ON emotion_logs(user_id, created_at DESC);

-- Add comment
COMMENT ON TABLE emotion_logs IS 'Stores user emotion tracking data for long-term mental health insights';