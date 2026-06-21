-- Add new notification types for context-aware features
DO $$ 
BEGIN
  -- Add new columns to notifications table for enhanced context
  ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS context_data jsonb;
  ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority integer DEFAULT 5;
  ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS suggestion_type text;
  ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;
  
  -- Create index for efficient querying
  CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority DESC, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_notifications_expires ON public.notifications(expires_at) WHERE expires_at IS NOT NULL;
  
  -- Create function to clean up expired notifications
  CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
  RETURNS void AS $func$
  BEGIN
    DELETE FROM public.notifications
    WHERE expires_at IS NOT NULL 
    AND expires_at < now();
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;
END $$;

COMMENT ON COLUMN public.notifications.context_data IS 'JSON data containing shared interests, location info, activity details, etc.';
COMMENT ON COLUMN public.notifications.priority IS 'Notification priority (1-10, 10 being highest)';
COMMENT ON COLUMN public.notifications.suggestion_type IS 'Type of suggestion: activity, conversation, meetup, interest_match, etc.';
COMMENT ON COLUMN public.notifications.expires_at IS 'When this notification expires (for time-sensitive suggestions)';