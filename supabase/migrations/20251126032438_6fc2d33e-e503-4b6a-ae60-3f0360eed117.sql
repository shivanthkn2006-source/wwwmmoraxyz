-- Create notification_settings table for advanced notification preferences
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Quiet hours settings
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  
  -- Adaptive volume settings
  adaptive_volume_enabled BOOLEAN DEFAULT true,
  daytime_volume DECIMAL(3,2) DEFAULT 0.8 CHECK (daytime_volume BETWEEN 0 AND 1),
  evening_volume DECIMAL(3,2) DEFAULT 0.5 CHECK (evening_volume BETWEEN 0 AND 1),
  night_volume DECIMAL(3,2) DEFAULT 0.2 CHECK (night_volume BETWEEN 0 AND 1),
  daytime_start TIME DEFAULT '08:00:00',
  evening_start TIME DEFAULT '18:00:00',
  night_start TIME DEFAULT '22:00:00',
  
  -- Sound theme
  sound_theme TEXT DEFAULT 'classic' CHECK (sound_theme IN ('classic', 'modern', 'nature', 'retro', 'custom')),
  
  -- Custom sound URLs (stored in Supabase storage)
  custom_sounds JSONB DEFAULT '{}'::jsonb,
  
  -- Vibration settings
  vibration_enabled BOOLEAN DEFAULT true,
  vibration_patterns JSONB DEFAULT '{}'::jsonb,
  
  -- Batching settings
  batching_enabled BOOLEAN DEFAULT true,
  batching_window_minutes INTEGER DEFAULT 5,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_settings
CREATE POLICY "Users can view their own notification settings"
  ON public.notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
  ON public.notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
  ON public.notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Add indexes for better query performance on notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON public.notifications(user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_type 
  ON public.notifications(user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_priority 
  ON public.notifications(priority DESC, created_at DESC);

-- Create storage bucket for custom notification sounds
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notification-sounds',
  'notification-sounds',
  false,
  5242880, -- 5MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for custom sounds
CREATE POLICY "Users can upload their own notification sounds"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'notification-sounds' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own notification sounds"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'notification-sounds' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own notification sounds"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'notification-sounds' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_updated_at();