/**
 * DURABLE COMPASS IMAGE RESOLUTION.
 *
 * Card art is copied into our own private `dhf-compass` bucket at generation
 * time. The row keeps `image_path` (ours) and `image_url` (the third-party
 * frame, fallback only). Here we mint short-lived signed URLs in ONE batch
 * call per feed load, so the card component stays presentation-only.
 */
import { supabase } from '@/integrations/supabase/client';
import type { DhfDailyPost } from '@/lib/dhfCompass';

export const COMPASS_BUCKET = 'dhf-compass';
/** Seven days — long enough for a feed session, short enough to stay private. */
const SIGNED_TTL_SECONDS = 60 * 60 * 24 * 7;

const cache = new Map<string, string>();

/**
 * Returns the same posts with `image_url` pointing at our storage whenever a
 * durable copy exists. Never throws: on any failure the remote URL is kept.
 */
export async function resolveCompassImages(posts: DhfDailyPost[]): Promise<DhfDailyPost[]> {
  const paths = Array.from(
    new Set(posts.map((p) => p.image_path).filter((p): p is string => Boolean(p) && !cache.has(p as string))),
  );

  if (paths.length) {
    try {
      const { data } = await supabase.storage.from(COMPASS_BUCKET).createSignedUrls(paths, SIGNED_TTL_SECONDS);
      for (const entry of data ?? []) {
        if (entry?.path && entry.signedUrl) cache.set(entry.path, entry.signedUrl);
      }
    } catch {
      /* keep remote URLs */
    }
  }

  return posts.map((post) => {
    const signed = post.image_path ? cache.get(post.image_path) : undefined;
    return signed ? { ...post, image_url: signed } : post;
  });
}

export default resolveCompassImages;
