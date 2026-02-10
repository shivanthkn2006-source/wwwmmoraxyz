-- Add INSERT policy for notifications table
-- Users can create notifications for any user (e.g., when liking posts, commenting, etc.)
CREATE POLICY "Authenticated users can create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);