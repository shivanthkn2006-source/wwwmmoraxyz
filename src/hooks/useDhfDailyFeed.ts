/**
 * ZOE'S DHF FEED HOOK — read-first, generate-once.
 *
 * Cost contract (this is the whole point of the architecture):
 *   1. Read today's rows for the signed-in member.
 *   2. Only if the day is incomplete AND generation has not been attempted in
 *      this browser session for this local date, ask the Edge Function once.
 *   3. Re-read and serve from the database from then on. A reload, a route
 *      change, or a second tab performs a pure SELECT — never a model call.
 *
 * Every failure degrades to an empty list: the feed renders exactly as before.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { deviceTimeZone, localDateIn } from '@/lib/growthSlot';
import { COMPASS_IMAGE_VERSION, COMPASS_SLOT_COUNT, duePosts, type DhfDailyPost } from '@/lib/dhfCompass';
import { resolveCompassImages } from '@/lib/dhfCompassImages';
import { hasLiveSession } from '@/lib/edgeSession';


const SELECT =
  'id, post_date, slot_time, category, headline, short_summary, full_story_content, image_url, image_path, image_source, image_prompt, image_prompt_version, image_prompt_hash, powered_by_badge, referral_cta, astrological_context, created_at';


/**
 * Guards are persisted per browser so a reload, a new sign-in or a second tab
 * never re-asks the generator for a day that was already attempted. Memory
 * alone would reset on every page load and cost tokens again.
 */
const GUARD_KEY = 'zoe.dhf.guards.v1';

type GuardKind = 'ensure' | 'reimage';

const readGuards = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(GUARD_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
};

const writeGuards = (guards: Record<string, number>) => {
  try {
    // Keep the store small: drop anything older than three days.
    const cutoff = Date.now() - 3 * 86_400_000;
    const pruned = Object.fromEntries(Object.entries(guards).filter(([, at]) => at >= cutoff));
    localStorage.setItem(GUARD_KEY, JSON.stringify(pruned));
  } catch {
    /* private mode / quota — memory guards still apply for this session */
  }
};

/** Session-scoped mirror so remounts never re-trigger anything either. */
const memoryGuards = new Set<string>();

const guardKey = (kind: GuardKind, id: string) => `${kind}:${id}`;

const guardTaken = (kind: GuardKind, id: string): boolean => {
  const key = guardKey(kind, id);
  if (memoryGuards.has(key)) return true;
  return Boolean(readGuards()[key]);
};

const takeGuard = (kind: GuardKind, id: string) => {
  const key = guardKey(kind, id);
  memoryGuards.add(key);
  const guards = readGuards();
  guards[key] = Date.now();
  writeGuards(guards);
};

const releaseGuard = (kind: GuardKind, id: string) => {
  const key = guardKey(kind, id);
  memoryGuards.delete(key);
  const guards = readGuards();
  delete guards[key];
  writeGuards(guards);
};

export interface DhfDailyFeedState {
  posts: DhfDailyPost[];
  loading: boolean;
  error: boolean;
  generating: boolean;
}

export function useDhfDailyFeed() {
  const { user } = useAuth();
  const [state, setState] = useState<DhfDailyFeedState>({
    posts: [], loading: true, error: false, generating: false,
  });
  const mounted = useRef(true);
  /** Rows fetched for today/yesterday, kept so the reveal timer can re-filter. */
  const rowsRef = useRef<DhfDailyPost[]>([]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const read = useCallback(async (userId: string, from: string, to: string) => {
    const { data, error } = await supabase
      .from('dhf_daily_posts')
      .select(SELECT)
      .eq('user_id', userId)
      .gte('post_date', from)
      .lte('post_date', to)
      .order('post_date', { ascending: false })
      .order('slot_time', { ascending: false });
    if (error) throw error;
    const resolved = await resolveCompassImages((data ?? []) as unknown as DhfDailyPost[]);
    rowsRef.current = resolved;
    return resolved;
  }, []);


  const load = useCallback(async (options: { force?: boolean } = {}) => {
    if (!user) {
      if (mounted.current) setState({ posts: [], loading: false, error: false, generating: false });
      return;
    }

    const tz = deviceTimeZone();
    const today = localDateIn(new Date(), tz);
    const yesterday = localDateIn(new Date(Date.now() - 86_400_000), tz);
    const guardKey = `${user.id}:${today}`;

    try {
      let rows = await read(user.id, yesterday, today);

      // Cards written under an older artwork contract are repaired once per
      // session. This never calls a model and never rewrites any card text.
      const stale = rows.some((row) => row.image_prompt_version !== COMPASS_IMAGE_VERSION);
      if (stale && !reimaged.has(user.id) && (await hasLiveSession())) {
        reimaged.add(user.id);
        const { error: repairError } = await supabase.functions.invoke('generate-dhf-daily-feed', {
          body: { action: 'reimage' },
        });
        if (repairError) reimaged.delete(user.id);
        else rows = await read(user.id, yesterday, today);
      }

      const todayCount = rows.filter((row) => row.post_date === today).length;
      const shouldGenerate = todayCount < COMPASS_SLOT_COUNT && (options.force || !attempted.has(guardKey));

      if (!shouldGenerate) {
        if (mounted.current) setState({ posts: duePosts(rows, new Date(), tz), loading: false, error: false, generating: false });
        return;
      }

      // Without a live token the function answers 401; serve what we have.
      if (!(await hasLiveSession())) {
        if (mounted.current) setState({ posts: duePosts(rows, new Date(), tz), loading: false, error: false, generating: false });
        return;
      }

      attempted.add(guardKey);
      if (mounted.current) {
        setState((prev) => ({ ...prev, posts: duePosts(rows, new Date(), tz), loading: false, generating: true }));
      }

      const { error: fnError } = await supabase.functions.invoke('generate-dhf-daily-feed', {
        body: { action: 'ensure', date: today, timezone: tz },
      });
      if (fnError) {
        // Allow one more attempt later in the session; still show what exists.
        attempted.delete(guardKey);
      } else {
        rows = await read(user.id, yesterday, today);
      }

      if (mounted.current) {
        setState({ posts: duePosts(rows, new Date(), tz), loading: false, error: Boolean(fnError), generating: false });
      }
    } catch {
      if (mounted.current) setState({ posts: [], loading: false, error: true, generating: false });
    }
  }, [user, read]);

  useEffect(() => { void load(); }, [load]);

  // Reveal slots as their local time arrives. Every minute we re-run duePosts
  // and, while today is still incomplete, re-read the rows so a card written by
  // the dispatcher after this page loaded appears at its scheduled time.
  useEffect(() => {
    if (!user) return;
    const tick = async () => {
      const tz = deviceTimeZone();
      const today = localDateIn(new Date(), tz);
      const yesterday = localDateIn(new Date(Date.now() - 86_400_000), tz);
      let rows = rowsRef.current;
      const completeToday = rows.filter((r) => r.post_date === today).length >= COMPASS_SLOT_COUNT;

      if (!completeToday) {
        try {
          rows = await read(user.id, yesterday, today);
        } catch {
          rows = rowsRef.current;
        }
      }
      if (!rows.length || !mounted.current) return;

      const due = duePosts(rows, new Date(), tz);
      setState((prev) => {
        const same =
          due.length === prev.posts.length &&
          due.every((p, i) => p.id === prev.posts[i]?.id);
        return same ? prev : { ...prev, posts: due };
      });
    };

    const timer = window.setInterval(() => { void tick(); }, 60_000);
    return () => window.clearInterval(timer);
  }, [user, read]);


  return {
    ...state,
    refresh: useCallback(() => load({ force: true }), [load]),
  };
}

export default useDhfDailyFeed;
