/**
 * DHF VIDEOS (client) — reads the ingested video library.
 *
 * Rows are written by the `dhf-video-dispatch` cron from the live YouTube Data
 * API, so every link here points at a real, embeddable, public video. Reads are
 * plain SELECTs against `public.dhf_videos`; nothing on this path costs a model
 * call or an API quota unit.
 */
import { supabase } from '@/integrations/supabase/client';

export interface DhfVideo {
  id: string;
  figure_slug: string;
  figure_name: string;
  topic: string;
  title: string;
  description: string;
  category: string;
  youtube_video_id: string | null;
  youtube_url: string | null;
  youtube_channel: string | null;
  tiktok_url: string | null;
  instagram_url: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  created_at: string;
}

const SELECT =
  'id, figure_slug, figure_name, topic, title, description, category, youtube_video_id, youtube_url, youtube_channel, tiktok_url, instagram_url, thumbnail_url, published_at, created_at';

/** YouTube returns titles HTML-escaped (`&#39;`, `&amp;`); render them as text. */
export const decodeEntities = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

export const fetchDhfVideos = async (limit = 24): Promise<DhfVideo[]> => {
  const { data, error } = await supabase
    .from('dhf_videos')
    .select(SELECT)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as DhfVideo[]).map((row) => ({
    ...row,
    title: decodeEntities(row.title ?? ''),
    description: decodeEntities(row.description ?? ''),
    youtube_channel: row.youtube_channel ? decodeEntities(row.youtube_channel) : row.youtube_channel,
  }));
};


/** Asks the backend to ingest a fresh slice of the roster (admin-triggered). */
export const requestDhfVideoIngest = async (limit = 8): Promise<{ inserted: number } | null> => {
  const { data, error } = await supabase.functions.invoke('dhf-video-dispatch', { body: { limit } });
  if (error) return null;
  return { inserted: Number((data as { inserted?: number })?.inserted ?? 0) };
};

/** The thumbnail we render: the stored one, or YouTube's own still. */
export const dhfVideoThumbnail = (video: DhfVideo): string | null =>
  video.thumbnail_url ||
  (video.youtube_video_id ? `https://i.ytimg.com/vi/${video.youtube_video_id}/hqdefault.jpg` : null);

export default fetchDhfVideos;
