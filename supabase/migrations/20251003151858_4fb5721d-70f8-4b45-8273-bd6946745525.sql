-- Create storage bucket for chat messages
INSERT INTO storage.buckets (id, name, public) 
VALUES ('messages', 'messages', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for message media uploads
CREATE POLICY "Users can view message media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'messages');

CREATE POLICY "Users can upload message media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'messages' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their message media" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'messages' AND auth.uid()::text = (storage.foldername(name))[1]);