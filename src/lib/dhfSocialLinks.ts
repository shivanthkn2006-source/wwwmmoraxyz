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

// Persisted per-device cache so reloads never re-request the same headlines.
const STORE_KEY = 'mmora.dhfSocialLinks.v1';
const MAX_STORED = 400;
try {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORE_KEY) : null;
  if (raw) for (const row of JSON.parse(raw) as DhfSocialLinks[]) if (row?.topicKey) memory.set(row.topicKey, row);
} catch { /* ignore corrupt cache */ }
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const persist = () => {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify([...memory.values()].slice(-MAX_STORED)));
    } catch { /* quota — ignore */ }
  }, 1000);
};

/**
 * Batching queue: many cards mounting at once are coalesced into a few
 * sequential requests of up to 12 topics (the server's max), instead of one
 * request per card — which previously tripped the 120/min rate limit (429).
 */
const BATCH_SIZE = 12;
const COOLDOWN_MS = 60_000;
let cooldownUntil = 0;
type Pending = { key: string; headline: string; category?: string; resolve: (v: DhfSocialLinks | null) => void };
const queue: Pending[] = [];
let draining = false;

const drain = async () => {
  if (draining) return;
  draining = true;
  try {
    while (queue.length) {
      const batch = queue.splice(0, BATCH_SIZE);
      if (Date.now() < cooldownUntil) {
        batch.forEach((p) => p.resolve(null));
        continue;
      }
      try {
        const { data, error } = await supabase.functions.invoke('dhf-social-links', {
          body: { topics: batch.map((p) => ({ headline: p.headline, category: p.category })) },
        });
        if (error) {
          const status = (error as { context?: { status?: number } })?.context?.status;
          if (status === 429) cooldownUntil = Date.now() + COOLDOWN_MS;
          batch.forEach((p) => p.resolve(null));
          continue;
        }
        const rows = (data as { links?: DhfSocialLinks[] })?.links ?? [];
        batch.forEach((p, i) => {
          const row = rows.find((r) => r?.topicKey === p.key) ?? rows[i];
          if (!row) return p.resolve(null);
          const links: DhfSocialLinks = { ...row, topicKey: p.key };
          memory.set(p.key, links);
          p.resolve(links);
        });
        persist();
      } catch {
        batch.forEach((p) => p.resolve(null));
      }
    }
  } finally {
    draining = false;
  }
};

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
  if (Date.now() < cooldownUntil) return null;

  const request = new Promise<DhfSocialLinks | null>((resolve) => {
    queue.push({ key, headline, category, resolve });
    // Collect every card that mounts in the same tick before sending.
    setTimeout(() => void drain(), 50);
  }).finally(() => inflight.delete(key));

  inflight.set(key, request);
  return request;
};

export const resetDhfSocialLinkCache = () => {
  memory.clear();
  inflight.clear();
  try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
};
