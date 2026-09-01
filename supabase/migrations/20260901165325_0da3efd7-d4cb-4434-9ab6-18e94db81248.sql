DROP INDEX IF EXISTS public.dhf_videos_youtube_video_id_key;
ALTER TABLE public.dhf_videos ADD CONSTRAINT dhf_videos_youtube_video_id_unique UNIQUE (youtube_video_id);