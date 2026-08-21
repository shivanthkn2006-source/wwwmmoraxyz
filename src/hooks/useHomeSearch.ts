import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { searchFeatures } from '@/data/appFeatures';
import { routeForEntity } from '@/lib/ambientDispatch';

export type SearchFilter = 'all' | 'profiles' | 'chats' | 'images' | 'loops' | 'videos' | 'other';

/** Which part of the indexed document contributed to the match. */
export type MatchSignal = 'text' | 'caption' | 'ocr' | 'visual' | 'author';

export interface HomeSearchResult {
  type: 'user' | 'post' | 'feature' | 'index';
  filter: SearchFilter;
  signals: MatchSignal[];
  id: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  route: string;
}

const ENTITY_LABEL: Record<string, string> = {
  post: 'Post',
  image: 'Image post',
  loop_video: 'Loop',
  quote: 'Quote',
  chat: 'Zoe chat',
  dhf_node: 'DHF node',
  profile: 'Member',
  spot: 'Selfie City spot',
  '3d_asset': 'VR asset',
};

const ENTITY_FILTER: Record<string, SearchFilter> = {
  profile: 'profiles',
  chat: 'chats',
  image: 'images',
  loop_video: 'loops',
  post: 'other',
  quote: 'other',
  dhf_node: 'other',
};

export const SEARCH_FILTERS: { id: SearchFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'chats', label: 'Chats' },
  { id: 'images', label: 'Images' },
  { id: 'loops', label: 'Loops' },
  { id: 'videos', label: 'Videos' },
];

export const SIGNAL_LABEL: Record<MatchSignal, string> = {
  text: 'text',
  caption: 'caption',
  ocr: 'OCR',
  visual: 'visual',
  author: 'author',
};

/**
 * Explains a match by locating the query term inside the indexed document:
 * author attribution line, caption/body text, or the vision-generated
 * `[Visual Data]` block (OCR when the description quotes readable text).
 */
export function explainMatch(term: string, synthesis: string, entityType: string): MatchSignal[] {
  const doc = (synthesis || '').toLowerCase();
  const needle = term.trim().toLowerCase();
  const visualAt = doc.indexOf('[visual data]');
  const head = visualAt >= 0 ? doc.slice(0, visualAt) : doc;
  const visual = visualAt >= 0 ? doc.slice(visualAt) : '';
  const lines = head.split('\n');
  const authorLine = lines[0]?.startsWith('by ') ? lines[0] : '';
  const bodyText = (authorLine ? lines.slice(1) : lines).join('\n');

  const signals: MatchSignal[] = [];
  if (needle && authorLine.includes(needle)) signals.push('author');
  if (needle && bodyText.includes(needle)) {
    signals.push(entityType === 'chat' || entityType === 'dhf_node' || entityType === 'profile' ? 'text' : 'caption');
  }
  if (needle && visual.includes(needle)) {
    const ocrHit = /text|sign|caption|reads|written|label/.test(visual) && /["“”']/.test(visual);
    signals.push(ocrHit ? 'ocr' : 'visual');
  }
  if (!signals.length && visual) signals.push('visual');
  if (!signals.length) signals.push('text');
  return Array.from(new Set(signals));
}

function cleanSynthesis(text: string): string {
  return (text || '')
    .replace(/\s+/g, ' ')
    .replace(/^By\s+/i, '')
    .trim();
}

/**
 * Home typeahead search.
 * Primary source is `zoe_universal_index` (every indexed post, loop, image,
 * chat, DHF node and profile across M'mora) via the `zoe_prefix_search` RPC,
 * which supports single-letter prefix matching. Profiles and the in-app
 * feature registry are merged in as secondary sources.
 */
export function useHomeSearch(query: string, enabled = true) {
  const [results, setResults] = useState<HomeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (!enabled || term.length < 1) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const safe = term.replace(/[%,()]/g, ' ').toLowerCase();

        const [indexRes, usersRes] = await Promise.all([
          supabase.rpc('zoe_prefix_search', { query_text: safe, match_count: 20 }),
          supabase
            .from('public_profiles')
            .select('user_id, display_name, username, profile_photo_url')
            .or(`display_name.ilike.%${safe}%,username.ilike.%${safe}%`)
            .limit(5)
            .abortSignal(controller.signal),
        ]);

        if (cancelled) return;
        if (indexRes.error && usersRes.error) {
          setError('Search is temporarily unavailable');
        }
        if (indexRes.error) console.warn('[useHomeSearch] index', indexRes.error.message);

        const next: HomeSearchResult[] = [];
        const seen = new Set<string>();

        (indexRes.data ?? []).forEach((row: any) => {
          if (row.entity_type === 'profile') return; // covered by the profile source below
          const key = `${row.entity_type}:${row.entity_id}`;
          if (seen.has(key)) return;
          seen.add(key);
          const body = cleanSynthesis(row.content_synthesis);
          const preview = typeof row.metadata?.previewUrl === 'string' && row.metadata.previewUrl.startsWith('http')
            ? row.metadata.previewUrl
            : typeof row.metadata?.mediaUrl === 'string' && row.metadata.mediaUrl.startsWith('http')
              ? row.metadata.mediaUrl
              : undefined;
          const mediaType = typeof row.metadata?.mediaType === 'string' ? row.metadata.mediaType : '';
          const filter: SearchFilter = row.entity_type === 'loop_video'
            ? 'loops'
            : mediaType === 'video'
              ? 'videos'
              : ENTITY_FILTER[row.entity_type] || 'other';
          next.push({
            type: 'index',
            filter,
            signals: explainMatch(safe, row.content_synthesis || '', row.entity_type),
            id: row.id,
            title: body.slice(0, 90) || ENTITY_LABEL[row.entity_type] || row.entity_type,
            subtitle: ENTITY_LABEL[row.entity_type] || row.entity_type,
            avatarUrl: preview,
            route: routeForEntity(row.entity_type, row.entity_id),
          });
        });

        (usersRes.data ?? []).forEach((u: any) => {
          const key = `profile:${u.user_id}`;
          if (seen.has(key)) return;
          seen.add(key);
          next.unshift({
            type: 'user',
            filter: 'profiles',
            signals: ['text'],
            id: u.user_id,
            title: u.display_name || u.username || 'Member',
            subtitle: u.username ? `@${u.username}` : 'Member',
            avatarUrl: u.profile_photo_url || undefined,
            route: `/profile/${u.user_id}`,
          });
        });

        searchFeatures(safe)
          .slice(0, 4)
          .forEach((f: any) => {
            next.push({
              type: 'feature',
              filter: 'other',
              signals: ['text'],
              id: f.id,
              title: f.name,
              subtitle: f.description,
              route: f.location || '/',
            });
          });


        setResults(next);
      } catch (err) {
        if (!cancelled && !controller.signal.aborted) {
          console.error('[useHomeSearch]', err);
          setError('Search failed');
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, enabled]);

  return { results, loading, error };
}

export async function recordHomeSearch(query: string, result?: HomeSearchResult) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;
    await supabase.from('search_history').insert({
      user_id: auth.user.id,
      search_query: query,
      result_type: result?.type ?? null,
      result_id: result?.id ?? null,
    });
  } catch {
    /* non-blocking */
  }
}
