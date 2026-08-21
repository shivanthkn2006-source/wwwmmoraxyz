import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  VR_GROUP_LABELS,
  VR_WORLD_COMPONENTS,
  isVrWorldQuery,
  searchVrWorld,
  vrGroupCounts,
} from '@/data/vrWorldIndex';
import { APP_FEATURES, searchFeatures } from '@/data/appFeatures';

export interface InsightLine {
  id: string;
  text: string;
  route?: string;
}

interface PlatformCounts {
  members: number;
  onlineNow: number;
  friends: number;
  posts: number;
  loops: number;
}

const COUNT_WORDS = ['how many', 'count', 'total', 'number of', 'users', 'friends', 'online', 'people'];

/**
 * Structural "search algorithm" answer lines shown live while the user types.
 * Combines the VR world registry, the in-app feature registry and live counts
 * from the backend, capped at 5 lines by design.
 */
export function usePlatformInsight(query: string, enabled = true, maxLines = 5) {
  const [lines, setLines] = useState<InsightLine[]>([]);
  const [counts, setCounts] = useState<PlatformCounts | null>(null);

  // Live counts are fetched once per session and reused for every query.
  useEffect(() => {
    if (!enabled || counts) return;
    let cancelled = false;
    (async () => {
      try {
        const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;

        const [members, online, friends, posts, loops] = await Promise.all([
          supabase.from('public_profiles').select('user_id', { count: 'exact', head: true }),
          supabase.from('online_sessions').select('id', { count: 'exact', head: true }).gte('last_seen_at', since),
          uid
            ? supabase.from('friendships').select('id', { count: 'exact', head: true }).eq('user_id', uid)
            : Promise.resolve({ count: 0 } as any),
          supabase.from('posts').select('id', { count: 'exact', head: true }),
          supabase.from('posts').select('id', { count: 'exact', head: true }).eq('media_type', 'video'),
        ]);

        if (cancelled) return;
        setCounts({
          members: members.count ?? 0,
          onlineNow: online.count ?? 0,
          friends: friends.count ?? 0,
          posts: posts.count ?? 0,
          loops: loops.count ?? 0,
        });
      } catch {
        if (!cancelled) setCounts({ members: 0, onlineNow: 0, friends: 0, posts: 0, loops: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, counts]);

  useEffect(() => {
    const term = query.trim();
    if (!enabled || term.length < 2) {
      setLines([]);
      return;
    }

    const lower = term.toLowerCase();
    const next: InsightLine[] = [];
    const vrMatches = searchVrWorld(term, maxLines);
    const asksCount = COUNT_WORDS.some((word) => lower.includes(word));

    if (isVrWorldQuery(lower) && !vrMatches.length) {
      next.push({
        id: 'vr-overview',
        text: `VR OMEGA world: ${VR_WORLD_COMPONENTS.length} indexed components across ${vrGroupCounts().length} systems.`,
        route: '/zoe-omega',
      });
    }

    for (const component of vrMatches) {
      next.push({
        id: `vr-${component.id}`,
        text: `VR · ${VR_GROUP_LABELS[component.group]} — ${component.name}: ${component.description}`,
        route: component.route,
      });
    }

    if (asksCount && counts) {
      if (lower.includes('friend')) {
        next.unshift({ id: 'count-friends', text: `You have ${counts.friends} friends; ${counts.onlineNow} members active in the last 5 minutes.`, route: '/friends' });
      } else {
        next.unshift({ id: 'count-users', text: `${counts.members} members on M'mora, ${counts.onlineNow} active now (last 5 min).` });
      }
      if (isVrWorldQuery(lower)) {
        next.splice(1, 0, {
          id: 'count-vr',
          text: `VR world hosts ${counts.onlineNow} live presences and ${VR_WORLD_COMPONENTS.length} world components.`,
          route: '/zoe-omega',
        });
      }
    }

    if (next.length < maxLines) {
      for (const feature of searchFeatures(lower).slice(0, maxLines - next.length)) {
        next.push({ id: `feature-${feature.id}`, text: `Feature · ${feature.name}: ${feature.description}`, route: feature.location });
      }
    }

    if (!next.length && (lower.includes('feature') || lower.includes('menu'))) {
      next.push({ id: 'feature-count', text: `${APP_FEATURES.length} in-app features and ${VR_WORLD_COMPONENTS.length} VR world components are indexed.` });
    }

    setLines(next.slice(0, maxLines));
  }, [query, enabled, counts, maxLines]);

  return { lines, counts };
}
