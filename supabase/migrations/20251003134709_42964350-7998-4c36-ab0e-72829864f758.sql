-- Create a secure function to accept friend requests
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id uuid;
  v_receiver_id uuid;
BEGIN
  -- Get request details and verify receiver
  SELECT sender_id, receiver_id 
  INTO v_sender_id, v_receiver_id
  FROM friend_requests
  WHERE id = request_id
    AND receiver_id = auth.uid()
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or unauthorized';
  END IF;

  -- Update request status
  UPDATE friend_requests
  SET status = 'accepted'
  WHERE id = request_id;

  -- Create friendship (both directions for easier querying)
  INSERT INTO friendships (user1_id, user2_id)
  VALUES (v_sender_id, v_receiver_id);

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;