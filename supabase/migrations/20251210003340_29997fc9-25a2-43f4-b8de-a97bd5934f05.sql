-- Add media columns to ai_companion_messages for attachment storage
ALTER TABLE public.ai_companion_messages
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.ai_companion_messages.media_url IS 'URL or base64 data of attached media (image, video, document)';
COMMENT ON COLUMN public.ai_companion_messages.media_type IS 'Type of attached media: image, video, or document';