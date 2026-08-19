import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'astro-posters';
const cache = new Map<string, string>();

/**
 * Resolve a private storage path (or pass through an absolute URL) into a
 * displayable image URL. Returns null when the poster is unavailable.
 */
export async function resolvePosterUrl(path?: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const cached = cache.get(path);
  if (cached) return cached;
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 6);
    if (error || !data?.signedUrl) return null;
    cache.set(path, data.signedUrl);
    return data.signedUrl;
  } catch {
    return null;
  }
}

export default resolvePosterUrl;
