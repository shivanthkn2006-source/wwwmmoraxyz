-- Add delivered field to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered BOOLEAN DEFAULT false;

-- Add deleted_by field to track who deleted the message (for "delete for me" functionality)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_by TEXT[] DEFAULT '{}';

-- Add reply_to_message_id for threaded replies
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add reactions field for message reactions
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}';

-- Add is_pinned field for pinned messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Add is_forwarded field to track forwarded messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT false;

-- Ensure new users get a default "online" status
CREATE OR REPLACE FUNCTION set_default_user_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS NULL THEN
    NEW.status := 'online';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set default status for new users
DROP TRIGGER IF EXISTS ensure_default_status ON public.profiles;
CREATE TRIGGER ensure_default_status
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_default_user_status();

-- Update existing users with NULL status to 'online'
UPDATE public.profiles SET status = 'online' WHERE status IS NULL;

-- Create function to mark messages as delivered when fetched
CREATE OR REPLACE FUNCTION mark_messages_delivered(p_user_id UUID, p_sender_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.messages
  SET delivered = true
  WHERE receiver_id = p_user_id 
    AND sender_id = p_sender_id
    AND delivered = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for better performance on message queries
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON public.messages(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_messages_deleted_by ON public.messages USING GIN(deleted_by);