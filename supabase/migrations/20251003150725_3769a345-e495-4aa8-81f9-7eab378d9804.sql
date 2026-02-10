-- Fix the accept_friend_request function to respect the friendships constraint
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_id uuid;
  v_receiver_id uuid;
  v_user1_id uuid;
  v_user2_id uuid;
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

  -- Ensure user1_id < user2_id to satisfy the check constraint
  IF v_sender_id < v_receiver_id THEN
    v_user1_id := v_sender_id;
    v_user2_id := v_receiver_id;
  ELSE
    v_user1_id := v_receiver_id;
    v_user2_id := v_sender_id;
  END IF;

  -- Create friendship with correct order
  INSERT INTO friendships (user1_id, user2_id)
  VALUES (v_user1_id, v_user2_id)
  ON CONFLICT (user1_id, user2_id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$function$;