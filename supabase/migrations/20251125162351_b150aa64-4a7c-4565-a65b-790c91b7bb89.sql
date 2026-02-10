-- Fix function search paths for security
CREATE OR REPLACE FUNCTION set_default_user_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS NULL THEN
    NEW.status := 'online';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION mark_messages_delivered(p_user_id UUID, p_sender_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.messages
  SET delivered = true
  WHERE receiver_id = p_user_id 
    AND sender_id = p_sender_id
    AND delivered = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;