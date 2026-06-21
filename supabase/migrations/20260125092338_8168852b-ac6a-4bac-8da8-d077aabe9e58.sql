-- ═══════════════════════════════════════════════════════════════════════════════
-- ZOE INFINITY MAIL SYSTEM - Real User-to-User Mail
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create the internal mail table
CREATE TABLE IF NOT EXISTS public.zoe_infinity_mail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  preview TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT DEFAULT 'personal' CHECK (category IN ('personal', 'work', 'financial', 'meeting', 'newsletter', 'family')),
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  -- For Zoe integration
  zoe_notified BOOLEAN DEFAULT FALSE,
  zoe_notified_at TIMESTAMP WITH TIME ZONE,
  -- For relationship context
  relationship_label TEXT,
  relationship_type TEXT
);

-- Create index for fast lookups
CREATE INDEX idx_zoe_infinity_mail_recipient ON public.zoe_infinity_mail(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_zoe_infinity_mail_sender ON public.zoe_infinity_mail(sender_id, created_at DESC);
CREATE INDEX idx_zoe_infinity_mail_unread ON public.zoe_infinity_mail(recipient_id) WHERE is_read = FALSE AND zoe_notified = FALSE;

-- Enable RLS
ALTER TABLE public.zoe_infinity_mail ENABLE ROW LEVEL SECURITY;

-- Users can see mail they sent or received
CREATE POLICY "Users can view their own mail"
ON public.zoe_infinity_mail FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can send mail (insert)
CREATE POLICY "Users can send mail"
ON public.zoe_infinity_mail FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can update mail they received (mark as read, star, archive)
CREATE POLICY "Users can update received mail"
ON public.zoe_infinity_mail FOR UPDATE
USING (auth.uid() = recipient_id);

-- Enable realtime for mail notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.zoe_infinity_mail;

-- Create notification queue table for Zoe announcements
CREATE TABLE IF NOT EXISTS public.zoe_mail_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_id UUID NOT NULL REFERENCES public.zoe_infinity_mail(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_username TEXT NOT NULL,
  relationship_label TEXT,
  subject TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  category TEXT DEFAULT 'personal',
  is_announced BOOLEAN DEFAULT FALSE,
  announced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.zoe_mail_notification_queue ENABLE ROW LEVEL SECURITY;

-- Users can see their own notifications
CREATE POLICY "Users can view their notifications"
ON public.zoe_mail_notification_queue FOR SELECT
USING (auth.uid() = recipient_id);

-- System can insert (via edge function)
CREATE POLICY "System can insert notifications"
ON public.zoe_mail_notification_queue FOR INSERT
WITH CHECK (true);

-- Users can mark as announced
CREATE POLICY "Users can update their notifications"
ON public.zoe_mail_notification_queue FOR UPDATE
USING (auth.uid() = recipient_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.zoe_mail_notification_queue;