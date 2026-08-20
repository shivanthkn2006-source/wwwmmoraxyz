import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { searchFeatures } from '@/data/appFeatures';

export interface HomeSearchResult {
  type: 'user' | 'post' | 'feature';
  id: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  route: string;
}

/**
 * Lightweight home search: reuses the same backend sources as the main SearchBar
 * (public_profiles + posts + in-app feature registry) with debounce.
 */
export function useHomeSearch(query: string, enabled = true) {
  const [results, setResults] = useState<HomeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (!enabled || term.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const safe = term.replace(/[%,()]/g, ' ').toLowerCase();

        const [usersRes, postsRes] = await Promise.all([
          supabase
            .from('public_profiles')
            .select('user_id, display_name, username, profile_photo_url')
            .or(`display_name.ilike.%${safe}%,username.ilike.%${safe}%`)
            .limit(5),
          supabase
            .from('posts')
            .select('id, content, user_id, created_at')
            .eq('visibility', 'global')
            .ilike('content', `%${safe}%`)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        if (cancelled) return;
        if (usersRes.error && postsRes.error) {
          setError('Search is temporarily unavailable');
        }

        const next: HomeSearchResult[] = [];

        (usersRes.data ?? []).forEach((u: any) => {
          next.push({
            type: 'user',
            id: u.user_id,
            title: u.display_name || u.username || 'Member',
            subtitle: u.username ? `@${u.username}` : undefined,
            avatarUrl: u.profile_photo_url || undefined,
            route: `/profile/${u.user_id}`,
          });
        });

        (postsRes.data ?? []).forEach((p: any) => {
          next.push({
            type: 'post',
            id: p.id,
            title: (p.content || 'Post').slice(0, 80),
            subtitle: 'Post',
            route: '',
          });
        });

        searchFeatures(safe)
          .slice(0, 4)
          .forEach((f: any) => {
            next.push({
              type: 'feature',
              id: f.id,
              title: f.name,
              subtitle: f.description,
              route: f.location || '/',
            });
          });

        setResults(next);
      } catch (err) {
        if (!cancelled) {
          console.error('[useHomeSearch]', err);
          setError('Search failed');
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
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
