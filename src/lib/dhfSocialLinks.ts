/**
 * DHF SOCIAL LINKS (client) — resolves the real YouTube / TikTok / Instagram
 * destinations for a compass card and remembers them for the tab's lifetime.
 *
 * Resolution happens once per headline: the backend caches the answer for the
 * whole platform, and this module caches it again in memory so scrolling the
 * feed never issues a second call.
 */
import { supabase } from '@/integrations/supabase/client';

export interface DhfSocialLinks {
  topicKey: string;
  youtube_video_id: string | null;
  youtube_url: string | null;
  youtube_title: string | null;
  youtube_channel: string | null;
  tiktok_url: string | null;
  instagram_url: string | null;
}

export const dhfTopicKey = (headline: string): string =>
  headline.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);

const memory = new Map<string, DhfSocialLinks>();
const inflight = new Map<string, Promise<DhfSocialLinks | null>>();

/** A never-dead fallback: platform search pages always resolve. */
export const searchFallback = (headline: string): DhfSocialLinks => ({
  topicKey: dhfTopicKey(headline),
  youtube_video_id: null,
  youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(headline)}`,
  youtube_title: null,
  youtube_channel: null,
  tiktok_url: `https://www.tiktok.com/search?q=${encodeURIComponent(headline)}`,
  instagram_url: 'https://www.instagram.com/explore/',
});

export const resolveDhfSocialLinks = async (
  headline: string,
  category?: string,
): Promise<DhfSocialLinks | null> => {
  const key = dhfTopicKey(headline);
  if (!key) return null;
  const hit = memory.get(key);
  if (hit) return hit;
  const running = inflight.get(key);
  if (running) return running;

  const request = (async (): Promise<DhfSocialLinks | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('dhf-social-links', {
        body: { topics: [{ headline, category }] },
      });
      if (error) return null;
      const row = (data as { links?: DhfSocialLinks[] })?.links?.[0];
      if (!row) return null;
      const links: DhfSocialLinks = { ...row, topicKey: key };
      memory.set(key, links);
      return links;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
};

export const resetDhfSocialLinkCache = () => {
  memory.clear();
  inflight.clear();
};
